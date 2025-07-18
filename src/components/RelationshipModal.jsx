import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import { useRelationships } from '../hooks/useSupabase'
import RelationshipForm from './RelationshipForm'
import EditRelationshipForm from './EditRelationshipForm'

const { FiX, FiPlus, FiTrash2, FiEdit, FiHeart, FiHome, FiBriefcase, FiUsers } = FiIcons

const RelationshipModal = ({ person, people, onClose, onAddPerson }) => {
  const [showForm, setShowForm] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState(null)
  const [relationships, setRelationships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { fetchRelationships, addRelationship, deleteRelationship, updateRelationship } = useRelationships()
  
  // Prevent back button from exiting app
  useEffect(() => {
    const handleBackButton = (event) => {
      event.preventDefault();
      
      if (showForm) {
        setShowForm(false);
        return;
      }
      
      if (editingRelationship) {
        setEditingRelationship(null);
        return;
      }
      
      if (onClose) onClose();
    };
    
    window.addEventListener('popstate', handleBackButton);
    
    // Add history entry to make back button work
    window.history.pushState(null, null, window.location.pathname);
    
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onClose, showForm, editingRelationship]);

  useEffect(() => {
    if (person) {
      loadRelationships()
    }
  }, [person])

  const loadRelationships = async () => {
    try {
      setLoading(true)
      setError(null)
      const rels = await fetchRelationships(person.id)
      console.log("Loaded relationships for person:", person.id, rels)
      setRelationships(rels)
    } catch (err) {
      console.error('Error loading relationships:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRelationships = async (relationshipData) => {
    try {
      setLoading(true)
      setError(null)
      console.log("Adding relationships:", relationshipData)
      
      for (const { relatedPersonId, relationshipType } of relationshipData) {
        await addRelationship(person.id, relatedPersonId, relationshipType)
      }
      
      await loadRelationships() // Reload relationships
      setShowForm(false)
      
      // Add history entry to handle back button
      window.history.pushState(null, null, window.location.pathname);
    } catch (err) {
      console.error('Error adding relationships:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditRelationship = async (relationshipData) => {
    try {
      setLoading(true)
      setError(null)
      console.log("Updating relationship:", editingRelationship.id, relationshipData)
      
      await updateRelationship(editingRelationship.id, relationshipData)
      await loadRelationships() // Reload relationships
      setEditingRelationship(null)
      
      // Add history entry to handle back button
      window.history.pushState(null, null, window.location.pathname);
    } catch (err) {
      console.error('Error updating relationship:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRelationship = async (relationshipId) => {
    if (window.confirm('Are you sure you want to delete this relationship?')) {
      try {
        setLoading(true)
        setError(null)
        await deleteRelationship(relationshipId)
        await loadRelationships() // Reload relationships
      } catch (err) {
        console.error('Error deleting relationship:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const getRelationshipIcon = (type) => {
    const familyTypes = ['father', 'mother', 'son', 'daughter', 'brother', 'sister', 'grandfather', 'grandmother', 'grandson', 'granddaughter', 'uncle', 'aunt', 'nephew', 'niece', 'husband', 'wife']
    const friendTypes = ['friend']
    const workTypes = ['colleague', 'boss', 'employee']
    
    if (familyTypes.includes(type)) return FiHome
    if (friendTypes.includes(type)) return FiHeart
    if (workTypes.includes(type)) return FiBriefcase
    return FiUsers
  }

  // FIXED: Format relationships for display with correct perspective
  const getDisplayRelationships = () => {
    return relationships.map(rel => {
      const isPersonA = rel.person_a_id === person.id
      const otherPersonId = isPersonA ? rel.person_b_id : rel.person_a_id
      
      // Get the name either from the nested object or find it in people array
      let otherPersonName = isPersonA ? (rel.person_b?.name || 'Unknown') : (rel.person_a?.name || 'Unknown')
      if (otherPersonName === 'Unknown') {
        const otherPerson = people.find(p => p.id === otherPersonId)
        if (otherPerson) otherPersonName = otherPerson.name
      }
      
      // CRITICAL FIX: Get the correct relationship type from the current person's perspective
      // If this person is person_A, we want relationship_type_b (what person_B is to person_A)
      // If this person is person_B, we want relationship_type (what person_A is to person_B)
      const relationshipType = isPersonA 
        ? (rel.relationship_type_b || rel.relationship_type) // What person B is to person A
        : rel.relationship_type // What person A is to person B
      
      console.log(`RelationshipModal display for ${person.name}:`, {
        isPersonA,
        otherPersonName,
        relationshipType,
        rel
      })
      
      return {
        id: rel.id,
        name: otherPersonName,
        type: relationshipType,
        icon: getRelationshipIcon(relationshipType),
        personId: otherPersonId,
        fullRelationship: rel,
        isPersonA
      }
    })
  }

  const displayRelationships = getDisplayRelationships()

  const handleClose = () => {
    if (onClose) onClose()
  }

  const handleEditClick = (displayRel) => {
    console.log('Edit clicked for relationship:', displayRel)
    setEditingRelationship({
      id: displayRel.id,
      person_a_id: displayRel.fullRelationship.person_a_id,
      person_b_id: displayRel.fullRelationship.person_b_id,
      currentPersonId: person.id,
      otherPersonId: displayRel.personId,
      otherPersonName: displayRel.name,
      currentRelationshipType: displayRel.type,
      isPersonA: displayRel.isPersonA
    })
    
    // Add history entry to handle back button
    window.history.pushState(null, null, window.location.pathname);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 fixed-modal"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <AnimatePresence mode="wait">
        {editingRelationship ? (
          <EditRelationshipForm
            key="edit-form"
            relationship={editingRelationship}
            person={person}
            people={people}
            onSubmit={handleEditRelationship}
            onCancel={() => {
              setEditingRelationship(null)
              // Add history entry to handle back button
              window.history.pushState(null, null, window.location.pathname);
            }}
          />
        ) : showForm ? (
          <RelationshipForm
            key="add-form"
            person={person}
            people={people}
            existingRelationships={relationships}
            onSubmit={handleAddRelationships}
            onCancel={() => {
              setShowForm(false)
              // Add history entry to handle back button
              window.history.pushState(null, null, window.location.pathname);
            }}
            onAddPerson={onAddPerson}
          />
        ) : (
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {person.name}'s Relationships
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <SafeIcon icon={FiX} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading relationships...</p>
              </div>
            ) : (
              <>
                {displayRelationships.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {displayRelationships.map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <SafeIcon icon={rel.icon} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{rel.name}</p>
                            <p className="text-sm text-gray-500 capitalize">
                              {rel.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditClick(rel)}
                            className="text-green-500 hover:text-green-700 p-1"
                            title="Edit relationship"
                          >
                            <SafeIcon icon={FiEdit} />
                          </button>
                          <button
                            onClick={() => handleDeleteRelationship(rel.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete relationship"
                          >
                            <SafeIcon icon={FiTrash2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 mb-6">
                    <SafeIcon icon={FiUsers} className="text-4xl text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No relationships recorded yet.</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowForm(true);
                    // Add history entry to handle back button
                    window.history.pushState(null, null, window.location.pathname);
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <SafeIcon icon={FiPlus} className="mr-2" />
                  Add New Relationship
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default RelationshipModal