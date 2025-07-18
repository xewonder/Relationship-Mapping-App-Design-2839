import { createClient } from '@supabase/supabase-js'

// Updated credentials from getSupabaseCredentials
const supabaseUrl = 'https://wfqbieturlsfehcshzsw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcWJpZXR1cmxzZmVoY3NoenN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzQ2NzEsImV4cCI6MjA2ODM1MDY3MX0.lALw85YTG8dlgwPBwnMBaXA5MiYB1pnFdx4BMbkHs0U'

// Validate credentials
if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://<PROJECT-ID>.supabase.co' || supabaseKey === '<ANON_KEY>') {
  console.error('Missing Supabase variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable URL detection for confirmation links
    flowType: 'pkce' // Add PKCE flow for more secure authentication
  }
})

// Log authentication state for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session ? 'User authenticated' : 'No user')
})

// Check if the database is properly connected
export const checkSupabaseConnection = async () => {
  try {
    // Simple query to verify connection
    const { data, error } = await supabase
      .from('people_tracker_2024')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }

    console.log('Supabase connection test successful')
    return true
  } catch (error) {
    console.error('Supabase connection test exception:', error)
    return false
  }
}

// Test database connection on import
checkSupabaseConnection()