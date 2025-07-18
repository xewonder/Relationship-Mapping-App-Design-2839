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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session retrieval error:", error)
        setAuthError(error.message)
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event)
      setSession(session)
      setUser(session?.user ?? null)
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

    return () => subscription.unsubscribe()
  }, [confirmationState])

  const signUp = async ({ email, password, fullName }) => {
    setAuthError(null)
    try {
      // Get the actual origin (works in development and production)
      const origin = window.location.origin
      console.log('Signup with redirect to:', origin)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: origin
        }
      })
      
      if (error) throw error
      
      // Check if email confirmation is needed
      if (data?.user?.identities?.length === 0 || 
          (data?.user?.identities && data.user.identities[0]?.identity_data?.email_verified === false)) {
        setConfirmationState({
          email,
          message: "Please check your email to confirm your account before signing in."
        })
      } else {
        // If no confirmation needed, consider the user signed in
        console.log("User signed up without needing confirmation")
      }
      
      return data
    } catch (error) {
      console.error("Sign up error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const signIn = async ({ email, password }) => {
    setAuthError(null)
    try {
      console.log("Attempting sign in for:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        // Check if the error is due to email not being confirmed
        if (error.message.includes("Email not confirmed")) {
          setConfirmationState({
            email,
            message: "Please check your email to confirm your account before signing in."
          })
        }
        throw error
      }
      
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
      setConfirmationState(null)
      setAuthError(null)
    } catch (error) {
      console.error("Sign out error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const resetPassword = async ({ email }) => {
    setAuthError(null)
    try {
      // Get the actual origin (works in development and production)
      const origin = window.location.origin
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${origin}/#reset-password`,
        }
      )
      
      if (error) throw error
      
      setConfirmationState({
        email,
        message: "Password reset instructions have been sent to your email."
      })
      
      return data
    } catch (error) {
      console.error("Reset password error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const updatePassword = async (newPassword) => {
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error("Update password error:", error)
      setAuthError(error.message)
      throw error
    }
  }

  const resendConfirmationEmail = async (email) => {
    setAuthError(null)
    try {
      // Get the actual origin (works in development and production)
      const origin = window.location.origin
      
      // This is a workaround since Supabase doesn't have a direct "resend confirmation" API
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: origin
        }
      })
      
      if (error) throw error
      
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
    updatePassword,
    resendConfirmationEmail,
    clearConfirmationState,
    getAuthError,
    clearAuthError
  }
}