import React from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'

const { FiAlertTriangle, FiXCircle, FiCheck } = FiIcons

const ExitWarning = ({ onConfirm, onCancel }) => {
  // Function to close the window
  const handleExit = () => {
    // Try different methods to exit the application
    if (typeof window !== 'undefined') {
      if (window.electron) {
        // For Electron apps
        window.electron.close()
      } else if (typeof window.chrome !== 'undefined' && window.chrome.app && window.chrome.app.window) {
        // For Chrome apps
        window.chrome.app.window.current().close()
      } else {
        // For browser windows
        try {
          window.close()
          // If window.close() doesn't work, try alternative methods
          setTimeout(() => {
            window.location.href = 'about:blank'
            if (window.top) {
              window.top.close()
            }
          }, 100)
        } catch (error) {
          console.log('Unable to close window automatically')
        }
      }
    }
    
    // Call the confirm handler
    onConfirm()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-auto"
      >
        <div className="text-center mb-6">
          <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiAlertTriangle} className="text-2xl text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Exit Application?</h2>
          <p className="text-gray-600 mt-2">
            Are you sure you want to exit the application? Any unsaved changes will be lost.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
          >
            <SafeIcon icon={FiXCircle} />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleExit}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <SafeIcon icon={FiCheck} />
            <span>Exit</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ExitWarning