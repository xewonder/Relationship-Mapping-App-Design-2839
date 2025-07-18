import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import { getBaseRelationshipType } from '../utils/relationshipMappings'

const { FiSave, FiX } = FiIcons

const relationshipOptions = [
  { type: 'sibling', label: 'Sibling' },
  { type: 'spouse', label: 'Spouse' },
  { type: 'ex_spouse', label: 'Ex-Spouse' },
  { type: 'parent', label: 'Parent' },
  { type: 'child', label: 'Child' },
  { type: 'grandparent', label: 'Grandparent' },
  { type: 'grandchild', label: 'Grandchild' },
  { type: 'parental_sibling', label: 'Aunt/Uncle' },
  { type: 'sibling_child', label: 'Niece/Nephew' },
  { type: 'friend', label: 'Friend' },
  { type: 'colleague', label: 'Colleague' },
  { type: 'boss', label: 'Boss' },
  { type: 'employee', label: 'Employee' }
]

const EditRelationshipForm = ({ relationship, person, people, onSubmit, onCancel }) => {
  // Find the base relationship type from the current specific type
  const [formData, setFormData] = useState({
    relationshipType: getBaseRelationshipType(relationship.currentRelationshipType)
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [historyHandled, setHistoryHandled] = useState(false)
  const bottomRef = useRef(null)

  // Prevent back button from exiting app - OPTIMIZED
  useEffect(() => {
    if (historyHandled) return;
    
    const handleBackButton = () => {
      onCancel();
    };
    
    window.addEventListener('popstate', handleBackButton);
    
    // Only add history entry once
    if (!historyHandled) {
      window.history.pushState({ action: 'editRelationship' }, '');
      setHistoryHandled(true);
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onCancel, historyHandled]);

  // Scroll to bottom when form opens
  useEffect(() => {
    if (bottomRef.current) {
      setTimeout(() => {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.relationshipType) {
      setError('Please select a relationship type')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      console.log('Submitting relationship update:', {
        relationshipId: relationship.id,
        relationshipType: formData.relationshipType,
        currentRelationship: relationship
      })
      
      await onSubmit({ relationshipType: formData.relationshipType })
    } catch (err) {
      console.error('Error updating relationship:', err)
      setError(err.message || 'Failed to update relationship')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('') // Clear error when user makes changes
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
    >
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Edit Relationship
      </h2>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Editing relationship between:</p>
        <p className="font-medium text-gray-800">
          {person.name} ↔ {relationship.otherPersonName}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Current: {relationship.currentRelationshipType}
        </p>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Select what {relationship.otherPersonName} is to {person.name}.</strong> For example, if {relationship.otherPersonName} is {person.name}'s father, select "Parent".
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What is {relationship.otherPersonName} to {person.name}?
          </label>
          <select
            name="relationshipType"
            value={formData.relationshipType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={isSubmitting}
          >
            <option value="">Select relationship</option>
            {relationshipOptions.map(option => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The relationship will be automatically adjusted based on each person's sex. For example, selecting "Parent" will become "Father" or "Mother" as appropriate.
          </p>
        </div>

        <div className="flex space-x-3 pt-4" ref={bottomRef}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <SafeIcon icon={FiSave} />
            )}
            <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <SafeIcon icon={FiX} />
            <span>Cancel</span>
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default EditRelationshipForm