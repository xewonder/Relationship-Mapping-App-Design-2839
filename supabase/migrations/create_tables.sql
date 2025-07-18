-- Create people table
CREATE TABLE IF NOT EXISTS people_tracker_2024 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sex TEXT CHECK (sex IN ('male','female','other')) DEFAULT 'male',
  nicknames TEXT,
  notes TEXT,
  proximity TEXT CHECK (proximity IN ('Close','Medium','Far')) DEFAULT 'Medium',
  photo_url TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create relationships table
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
CREATE POLICY "Users can only access their own people" 
ON people_tracker_2024 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own relationships" 
ON relationships_tracker_2024 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create functions for client-side table creation
CREATE OR REPLACE FUNCTION create_people_table()
RETURNS TEXT AS $$
BEGIN
    RETURN 'People table exists';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_relationships_table()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Relationships table exists';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'person-photos', 'person-photos', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'person-photos'
);

-- Set up storage policy to allow authenticated users to upload files
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'person-photos');

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'person-photos' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Allow owners to update their photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'person-photos' AND
    auth.uid() = owner
);

CREATE POLICY "Allow owners to delete their photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'person-photos' AND
    auth.uid() = owner
);