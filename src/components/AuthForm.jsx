import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'

const { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowRight, FiRefreshCw, FiAlertCircle } = FiIcons

const AuthForm = ({ onAuth, confirmationState, onResendConfirmation, authError }) => {
  const [mode, setMode] = useState('login') // 'login','register','forgot'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [urlError, setUrlError] = useState(false)

  // Check for hash fragments that might indicate an error with the redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('error')) {
      setUrlError(true);
      setMessage('There was an issue with your authentication link. Please try signing in or request a new confirmation email.');
    }
  }, []);

  // Set email from confirmationState if available
  useEffect(() => {
    if (confirmationState?.email) {
      setFormData(prev => ({ ...prev, email: confirmationState.email }))
      setMessage(confirmationState.message)
    }
  }, [confirmationState])

  // Set auth error message if provided
  useEffect(() => {
    if (authError) {
      setMessage(authError)
    }
  }, [authError])

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }

        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }

        await onAuth('register', {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          options: {
            emailRedirectTo: window.location.origin
          }
        })
      } else if (mode === 'login') {
        await onAuth('login', {
          email: formData.email,
          password: formData.password
        })
      } else if (mode === 'forgot') {
        await onAuth('forgot', {
          email: formData.email
        })
        setMessage('Password reset email sent! Check your inbox.')
      }
    } catch (error) {
      // Handle database error specially
      if (error.message?.includes('Database error')) {
        setMessage('Server configuration issue. Please try again later or contact support.')
      } else {
        setMessage(error.message || 'Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setLoading(true)
    try {
      const result = await onResendConfirmation(formData.email)
      setMessage(result.message)
      setUrlError(false)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: ''
    })
    setMessage('')
    setUrlError(false)
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    resetForm()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiUser} className="text-2xl text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h1>
          <p className="text-gray-600 mt-2">
            {mode === 'login' && 'Sign in to your relationship tracker'}
            {mode === 'register' && 'Join us to start tracking relationships'}
            {mode === 'forgot' && 'Enter your email to reset your password'}
          </p>
        </div>

        {/* URL Error message */}
        {urlError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <SafeIcon icon={FiAlertCircle} className="text-red-600" />
              <span className="font-medium text-red-800">Authentication Error</span>
            </div>
            <p className="text-red-700 mb-2">{message}</p>
            <button
              onClick={handleResendConfirmation}
              disabled={loading || !formData.email}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center disabled:opacity-50"
            >
              <SafeIcon icon={FiRefreshCw} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
              Resend confirmation email
            </button>
          </div>
        )}

        {/* Email confirmation message */}
        {confirmationState && !urlError && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 mb-2">{confirmationState.message}</p>
            <button
              onClick={handleResendConfirmation}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <SafeIcon icon={FiRefreshCw} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
              Resend confirmation email
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
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

          {mode !== 'forgot' && (
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
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <SafeIcon icon={FiLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          )}

          {message && !confirmationState && !urlError && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('sent') || message.includes('success')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
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
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Email'}
                </span>
                <SafeIcon icon={FiArrowRight} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {mode === 'login' && (
            <>
              <button
                onClick={() => switchMode('forgot')}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Forgot your password?
              </button>
              <div className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => switchMode('register')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'register' && (
            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign in
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="text-center text-sm text-gray-600">
              Remember your password?{' '}
              <button
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default AuthForm