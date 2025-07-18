import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'

export const useSimpleAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        console.log("Checking for existing session...")
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        } else {
          console.log("Session check result:", session ? "Found session" : "No session")
          setUser(session?.user || null)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session ? 'User present' : 'No user')
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Make sure we have the user data
          if (session?.user) {
            setUser(session.user)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      console.log("Attempting sign out")
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
      console.log("Sign out successful")
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, signOut }
}