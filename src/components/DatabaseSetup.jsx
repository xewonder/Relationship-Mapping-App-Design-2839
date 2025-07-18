import React, { useState } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import { supabase } from '../config/supabase'

const { FiDatabase, FiCheck, FiAlertCircle } = FiIcons

const DatabaseSetup = ({ onSetupComplete }) => {
  const [isCreating, setIsCreating] = useState(false)
  const [status, setStatus] = useState('')

  const createTables = async () => {
    setIsCreating(true)
    setStatus('Creating tables...')

    try {
      // Run the SQL commands directly using the raw query method
      const { error: peopleTableError } = await supabase.from('people_tracker_2024')
        .select('id')
        .limit(1)
        .then(async result => {
          if (result.error) {
            // Table doesn't exist, create it
            return await supabase.rpc('create_people_table')
          }
          return { error: null }
        })

      if (peopleTableError) {
        console.error('Error checking/creating people table:', peopleTableError)
        throw peopleTableError
      }

      // Create relationships table
      const { error: relTableError } = await supabase.from('relationships_tracker_2024')
        .select('id')
        .limit(1)
        .then(async result => {
          if (result.error) {
            // Table doesn't exist, create it
            return await supabase.rpc('create_relationships_table')
          }
          return { error: null }
        })

      if (relTableError) {
        console.error('Error checking/creating relationships table:', relTableError)
        throw relTableError
      }

      setStatus('Tables created successfully!')
      setTimeout(() => {
        onSetupComplete()
      }, 2000)
    } catch (error) {
      console.error('Error creating tables:', error)
      setStatus(`Error creating tables: ${error.message || 'Unknown error'}. Please check your Supabase configuration.`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6"
    >
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <SafeIcon icon={FiDatabase} className="text-6xl text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Database Setup</h1>
          <p className="text-gray-600">
            First, let's set up your Supabase database tables for the relationship tracker.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Database Tables
          </h2>
          <p className="text-gray-600 mb-4">
            Click the button below to create the necessary database tables automatically:
          </p>

          <button
            onClick={createTables}
            disabled={isCreating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating Tables...</span>
              </>
            ) : (
              <>
                <SafeIcon icon={FiDatabase} />
                <span>Create Tables Automatically</span>
              </>
            )}
          </button>

          {status && (
            <div className={`mt-4 p-3 rounded-lg ${status.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              <div className="flex items-center space-x-2">
                <SafeIcon icon={status.includes('Error') ? FiAlertCircle : FiCheck} />
                <span>{status}</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={onSetupComplete}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <SafeIcon icon={FiCheck} />
            <span>Skip Setup - Go to App</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default DatabaseSetup