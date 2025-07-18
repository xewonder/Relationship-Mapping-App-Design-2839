import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import UserSettings from './UserSettings'

const { FiUser, FiLogOut, FiSettings, FiChevronDown } = FiIcons

const UserProfile = ({ user, onSignOut }) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const getUserInitials = (user) => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user?.email?.charAt(0).toUpperCase() || 'U'
  }

  const getUserDisplayName = (user) => {
    return user?.user_metadata?.full_name || user?.email || 'User'
  }

  const handleSettingsClick = () => {
    setShowDropdown(false)
    setShowSettings(true)
  }

  const handleSignOut = () => {
    setShowDropdown(false)
    onSignOut()
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3 bg-white rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
            {getUserInitials(user)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-800">
              {getUserDisplayName(user)}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <SafeIcon icon={FiChevronDown} className={`text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">
                  {getUserDisplayName(user)}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleSettingsClick}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <SafeIcon icon={FiSettings} />
                <span>Settings</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <SafeIcon icon={FiLogOut} />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop to close dropdown */}
        {showDropdown && (
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <UserSettings
            user={user}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default UserProfile