-- Enable RLS but add policies to allow all operations for now
ALTER TABLE people_tracker_2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships_tracker_2024 ENABLE ROW LEVEL SECURITY;

-- People table policies
CREATE POLICY "Allow all operations on people" ON people_tracker_2024
FOR ALL USING (true)
WITH CHECK (true);

-- Relationships table policies
CREATE POLICY "Allow all operations on relationships" ON relationships_tracker_2024
FOR ALL USING (true)
WITH CHECK (true);