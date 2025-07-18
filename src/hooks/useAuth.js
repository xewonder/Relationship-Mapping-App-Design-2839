import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [confirmationState, setConfirmationState] = useState(null)
  const [authError, setAuthError] = useState(null)

  // Check for hash fragments that might contain auth tokens
  useEffect(() => {
    const handleHashParams = async () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // There's an auth token in the URL, let Supabase handle it
        try {
          setLoading(true)
          const { data, error } = await supabase.auth.getSession()
          if (error) throw error
          if (data?.session) {
            setSession(data.session)
            setUser(data.session.user)
            // Clean the URL by removing the hash
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (error) {
          console.error('Error processing auth token:', error)
          setAuthError(error.message)
        } finally {
          setLoading(false)
        }
      }
    }
    handleHashParams()
  }, [])

  useEffect(() => {
    // Debug
    console.log('Initializing auth hook')

    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Session retrieval error:", error)
          setAuthError(error.message)
        } else {
          console.log("Got session:", data.session ? "Yes" : "No")
          setSession(data.session)
          setUser(data.session?.user || null)
        }
      } catch (e) {
        console.error("Unexpected error getting session:", e)
      } finally {
        setLoading(false)
      }
    }
    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event)
      if (session) {
        console.log('User authenticated:', session.user?.email)
        setUser(session.user)
      } else {
        console.log('No user after auth change')
        setUser(null)
      }
      setSession(session)
      setLoading(false)

      // If user just signed in after confirmation, clear confirmation state
      if (event === 'SIGNED_IN' && confirmationState) {
        setConfirmationState(null)
      }

      // Clear any auth errors on successful auth events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setAuthError(null)
      }
    })

    return () => {
      console.log('Cleaning up auth subscription')
      subscription.unsubscribe()
    }
  }, [confirmationState])

  const signUp = async ({ email, password, fullName }) => {
    console.log('Attempting signup for:', email)
    setAuthError(null)
    try {
      // Get the actual origin (works in development and production)
      const origin = window.location.origin
      console.log('Signup with redirect to:', origin)
      
      // Modified signup to use simpler options
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
          // Remove emailRedirectTo to simplify the process
        }
      })
      
      if (error) {
        console.error("Signup error:", error)
        throw error
      }
      
      console.log("Signup result:", data)
      
      // For development, consider the user signed up without confirmation
      setUser(data.user)
      return data
    } catch (error) {
      console.error("Sign up error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const signIn = async ({ email, password }) => {
    console.log('Attempting sign in for:', email)
    setAuthError(null)
    try {
      // Use signInWithPassword directly without extra options
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error)
        throw error
      }

      console.log("Sign in successful:", data)
      setUser(data.user)
      setConfirmationState(null)
      return data
    } catch (error) {
      console.error("Sign in error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setConfirmationState(null)
      setAuthError(null)
    } catch (error) {
      console.error("Sign out error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const resetPassword = async ({ email }) => {
    console.log('Attempting password reset for:', email)
    setAuthError(null)
    try {
      // Get the actual origin (works in development and production)
      const origin = window.location.origin
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${origin}/#reset-password` }
      )

      if (error) {
        console.error("Reset password error:", error)
        throw error
      }

      setConfirmationState({
        email,
        message: "Password reset instructions have been sent to your email."
      })
      return { success: true }
    } catch (error) {
      console.error("Reset password error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const resendConfirmationEmail = async (email) => {
    console.log('Resending confirmation email to:', email)
    setAuthError(null)
    try {
      // Use OTP method instead since there's no direct resend confirmation
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false // Don't create a new user
        }
      })

      if (error) {
        console.error("Resend confirmation error:", error)
        throw error
      }

      return { message: "Confirmation email has been resent. Please check your inbox." }
    } catch (error) {
      console.error("Resend confirmation error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const clearConfirmationState = () => {
    setConfirmationState(null)
  }

  const getAuthError = () => {
    return authError;
  }

  const clearAuthError = () => {
    setAuthError(null);
  }

  return {
    user,
    session,
    loading,
    confirmationState,
    authError,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword: async () => { throw new Error('Not implemented yet') },
    resendConfirmationEmail,
    clearConfirmationState,
    getAuthError,
    clearAuthError
  }
}