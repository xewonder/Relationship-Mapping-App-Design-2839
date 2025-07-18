-- Create a function to check and create auth schema if needed
CREATE OR REPLACE FUNCTION check_auth_schema() RETURNS void AS $$
BEGIN
  -- Make sure auth schema exists with proper permissions
  -- This is just a placeholder - Supabase normally handles this automatically
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a function to ensure proper tables for people tracking exist
CREATE OR REPLACE FUNCTION ensure_people_tables() RETURNS void AS $$
BEGIN
  -- Create people table if it doesn't exist
  CREATE TABLE IF NOT EXISTS people_tracker_2024 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sex TEXT CHECK (sex IN ('male', 'female', 'other')) DEFAULT 'male',
    nicknames TEXT,
    notes TEXT,
    proximity TEXT CHECK (proximity IN ('Close', 'Medium', 'Far')) DEFAULT 'Medium',
    photo_url TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create relationships table if it doesn't exist
  CREATE TABLE IF NOT EXISTS relationships_tracker_2024 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_a_id UUID REFERENCES people_tracker_2024(id) ON DELETE CASCADE,
    person_b_id UUID REFERENCES people_tracker_2024(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    relationship_type_b TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(person_a_id, person_b_id, user_id)
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_people_name ON people_tracker_2024(name);
  CREATE INDEX IF NOT EXISTS idx_people_user_id ON people_tracker_2024(user_id);
  CREATE INDEX IF NOT EXISTS idx_relationships_person_a ON relationships_tracker_2024(person_a_id);
  CREATE INDEX IF NOT EXISTS idx_relationships_person_b ON relationships_tracker_2024(person_b_id);
  CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON relationships_tracker_2024(user_id);

  -- Enable Row Level Security
  ALTER TABLE people_tracker_2024 ENABLE ROW LEVEL SECURITY;
  ALTER TABLE relationships_tracker_2024 ENABLE ROW LEVEL SECURITY;

  -- Create RLS policies
  DROP POLICY IF EXISTS "Users can only access their own people" ON people_tracker_2024;
  CREATE POLICY "Users can only access their own people" 
    ON people_tracker_2024 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can only access their own relationships" ON relationships_tracker_2024;
  CREATE POLICY "Users can only access their own relationships" 
    ON relationships_tracker_2024 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
END;
$$ LANGUAGE plpgsql;

-- Execute the functions
SELECT check_auth_schema();
SELECT ensure_people_tables();

-- Drop the functions after use
DROP FUNCTION check_auth_schema();
DROP FUNCTION ensure_people_tables();