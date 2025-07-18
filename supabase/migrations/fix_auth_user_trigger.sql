-- Fix Authentication User Trigger Migration
-- This migration creates the public.users table and trigger to handle new user registration

-- Drop existing trigger and function if they exist (safe cleanup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create or replace the public.users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create the trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into public.users table
  -- Use COALESCE to handle potential NULL email values
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NEW.email, ''),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Ensure existing auth users are synced to public.users (backfill)
INSERT INTO public.users (id, email, created_at)
SELECT 
  id, 
  COALESCE(email, '') as email,
  COALESCE(created_at, NOW()) as created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, ''),
  updated_at = NOW();

-- Add a comment to document the migration
COMMENT ON TABLE public.users IS 'Public users table synced with auth.users via trigger';
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to sync new auth users to public.users table';