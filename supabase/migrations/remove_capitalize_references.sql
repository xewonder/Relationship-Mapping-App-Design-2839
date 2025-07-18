-- Remove any references to capitalize_words function
-- This migration will clean up any triggers or functions that might be calling it

-- First, let's drop any existing triggers that might be problematic
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Check for and drop any triggers that might be calling capitalize_words
    FOR r IN 
        SELECT trigger_name, event_object_table, trigger_schema
        FROM information_schema.triggers 
        WHERE action_statement ILIKE '%capitalize_words%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', 
                      r.trigger_name, r.trigger_schema, r.event_object_table);
        RAISE NOTICE 'Dropped trigger %', r.trigger_name;
    END LOOP;
END $$;

-- Drop any functions that might be calling capitalize_words
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT routine_name, routine_schema
        FROM information_schema.routines 
        WHERE routine_definition ILIKE '%capitalize_words%'
        AND routine_schema = 'public'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I CASCADE', 
                      r.routine_schema, r.routine_name);
        RAISE NOTICE 'Dropped function %', r.routine_name;
    END LOOP;
END $$;

-- Recreate a simple handle_new_user function without capitalize_words
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- Simple user creation without any text processing
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
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
    AFTER INSERT ON auth.users 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Clean up any orphaned capitalize_words function references
DROP FUNCTION IF EXISTS capitalize_words(text) CASCADE;
DROP FUNCTION IF EXISTS public.capitalize_words(text) CASCADE;

-- Ensure our tables have proper structure without any complex triggers
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users 
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users 
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users 
    FOR UPDATE USING (auth.uid() = id);

-- Add a comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Simple user creation trigger without text processing functions';