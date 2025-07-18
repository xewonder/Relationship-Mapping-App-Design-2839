import { createClient } from '@supabase/supabase-js'

// These values are already correct from the existing file
const supabaseUrl = 'https://wfqbieturlsfehcshzsw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWJpZXR1cmxzZmVoY3NoenN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzQ2NzEsImV4cCI6MjA2ODM1MDY3MX0.lALw85YTG8dlgwPBwnMBaXA5MiYB1pnFdx4BMbkHs0U'

if (supabaseUrl === 'https://<PROJECT-ID>.supabase.co' || supabaseKey === '<ANON_KEY>') {
  throw new Error('Missing Supabase variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true // Enable URL detection for confirmation links
  }
})

// Log authentication state for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session ? 'User authenticated' : 'No user')
})

// Setup database function that doesn't rely on RPC calls
export const setupDatabase = async () => {
  try {
    console.log('Setting up database...')
    
    // Create people table
    const { error: peopleError } = await supabase.query(`
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
    `)
    
    if (peopleError) {
      console.error('Error creating people table:', peopleError)
      // Continue anyway as the table might already exist
    }
    
    // Create relationships table
    const { error: relError } = await supabase.query(`
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
    `)
    
    if (relError) {
      console.error('Error creating relationships table:', relError)
      // Continue anyway as the table might already exist
    }
    
    return { success: true }
  } catch (error) {
    console.error('Database setup error:', error)
    return { success: false, error: error.message }
  }
}