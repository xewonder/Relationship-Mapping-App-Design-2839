import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import { supabase } from '../config/supabase'

const { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowRight, FiAlertCircle, FiArrowLeft } = FiIcons

const LoginPage = ({ onAuthSuccess, onAuthError, authError }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  })

  // Test connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        console.log("Auth connection test:", error ? "Failed" : "Success")
        if (error) console.error("Auth test error:", error)
      } catch (err) {
        console.error("Auth test exception:", err)
      }
    }
    testConnection()
  }, [])

  // Set auth error message if provided
  useEffect(() => {
    if (authError) {
      setMessage(authError)
    }
  }, [authError])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setMessage('') // Clear message on input change
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isForgotPassword) {
        // Handle forgot password
        const { error } = await supabase.auth.resetPasswordForEmail(
          formData.email,
          { redirectTo: window.location.origin }
        )
        
        if (error) throw error
        
        setMessage('Password reset instructions sent to your email.')
        return
      }
      
      console.log(`Attempting ${isLogin ? 'login' : 'signup'} with:`, formData.email)
      
      if (isLogin) {
        // Sign in with basic parameters only
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })

        if (error) {
          console.error('Login error:', error)
          if (onAuthError) onAuthError(error)
          throw error
        }

        console.log('Login successful:', data)
        onAuthSuccess(data.user)
      } else {
        // Validate password
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }

        // Use more basic signup approach to avoid email redirect issues
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.fullName }
          }
        })

        if (error) {
          console.error('Signup error:', error)
          if (onAuthError) onAuthError(error)
          throw error
        }

        console.log('Signup response:', data)
        if (data.user) {
          if (data.session) {
            // User created and signed in
            onAuthSuccess(data.user)
          } else {
            // Email confirmation might be required
            setMessage('Account created! Check your email for confirmation.')
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      // Specific error handling
      if (error.message?.includes('Database error')) {
        setMessage('Server configuration issue. Please try again later or contact support.')
      } else {
        setMessage(error.message || 'Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = (mode) => {
    if (mode === 'login') {
      setIsLogin(true)
      setIsForgotPassword(false)
    } else if (mode === 'register') {
      setIsLogin(false)
      setIsForgotPassword(false)
    } else if (mode === 'forgot') {
      setIsLogin(false)
      setIsForgotPassword(true)
    }
    
    setMessage('')
    setFormData({
      email: '',
      password: '',
      fullName: ''
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={isForgotPassword ? FiMail : FiUser} className="text-2xl text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Welcome Back' : isForgotPassword ? 'Reset Password' : 'Create Account'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isLogin 
              ? 'Sign in to your relationship tracker' 
              : isForgotPassword 
                ? 'Enter your email to receive password reset instructions' 
                : 'Join us to start tracking relationships'
            }
          </p>
        </div>

        {/* Auth Error Message */}
        {message && (
          <div className={`mb-6 p-4 ${message.includes('sent') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg`}>
            <div className="flex items-center space-x-2">
              <SafeIcon 
                icon={message.includes('sent') ? FiArrowRight : FiAlertCircle} 
                className={message.includes('sent') ? "text-green-600" : "text-red-600"} 
              />
              <p className={message.includes('sent') ? "text-green-700" : "text-red-700"}>{message}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isForgotPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <SafeIcon icon={FiUser} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <SafeIcon icon={FiMail} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <SafeIcon icon={FiLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <SafeIcon icon={showPassword ? FiEyeOff : FiEye} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <span>
                  {isLogin 
                    ? 'Sign In' 
                    : isForgotPassword 
                      ? 'Send Reset Instructions' 
                      : 'Create Account'
                  }
                </span>
                <SafeIcon icon={FiArrowRight} />
              </>
            )}
          </button>
        </form>

        {/* Back to Login / Switch Mode */}
        <div className="mt-6 text-center">
          {isForgotPassword ? (
            <button 
              onClick={() => toggleMode('login')} 
              className="flex items-center justify-center space-x-1 text-blue-600 hover:text-blue-800 mx-auto"
            >
              <SafeIcon icon={FiArrowLeft} />
              <span>Back to login</span>
            </button>
          ) : (
            <>
              {isLogin && (
                <button 
                  onClick={() => toggleMode('forgot')} 
                  className="block w-full text-blue-600 hover:text-blue-800 mb-3"
                >
                  Forgot your password?
                </button>
              )}
              <p className="text-gray-600 text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                {' '}
                <button
                  onClick={() => toggleMode(isLogin ? 'register' : 'login')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage