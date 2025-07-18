import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from './common/SafeIcon'
import { useSimpleAuth } from './hooks/useSimpleAuth'
import { usePeople, useRelationships } from './hooks/useSupabase'
import LoginPage from './components/LoginPage'
import UserProfile from './components/UserProfile'
import PersonCard from './components/PersonCard'
import PersonForm from './components/PersonForm'
import RelationshipModal from './components/RelationshipModal'
import SearchBar from './components/SearchBar'
import ExitWarning from './components/ExitWarning'
import './App.css'

const { FiUsers, FiPlus, FiRefreshCw, FiFilter, FiMapPin, FiX } = FiIcons

function App() {
  const { user, loading: authLoading, signOut } = useSimpleAuth()
  const { people, loading, error, fetchPeople, searchPeople, addPerson, updatePerson, deletePerson } = usePeople()
  const { relationships, fetchRelationships } = useRelationships()

  const [showPersonForm, setShowPersonForm] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [allRelationships, setAllRelationships] = useState([])
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0)
  const [searchLoading, setSearchLoading] = useState(false)
  const [proximityFilter, setProximityFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('') // Track the current search query
  const [formSubmitError, setFormSubmitError] = useState(null) // New state for form submission errors
  const [historyState, setHistoryState] = useState({ initialized: false }) // Track history state

  // Force a refresh by incrementing the trigger
  const triggerDataRefresh = () => {
    setDataRefreshTrigger(prev => prev + 1)
  }

  // Safe history push state - prevent multiple calls
  const safelyAddHistoryEntry = useCallback(() => {
    if (!historyState.initialized) {
      window.history.pushState({ page: 'main' }, '', window.location.pathname)
      setHistoryState({ initialized: true })
    }
  }, [historyState])

  // Fetch people and relationships when user is authenticated or refresh is triggered
  useEffect(() => {
    if (user) {
      fetchPeople()
      fetchAllRelationships()
    }
  }, [user, dataRefreshTrigger])

  // Initialize history state only once when component mounts
  useEffect(() => {
    safelyAddHistoryEntry()
  }, [safelyAddHistoryEntry])

  // Prevent Android back button from exiting the app - with optimized history handling
  useEffect(() => {
    const handleBackButton = (e) => {
      // Don't prevent the default action, but handle our app state
      
      // If modal is open, close it
      if (showPersonForm) {
        e.preventDefault() // Only prevent default when we're handling it
        setShowPersonForm(false)
        setEditingPerson(null)
        return
      }

      if (selectedPerson) {
        e.preventDefault() // Only prevent default when we're handling it
        setSelectedPerson(null)
        return
      }

      // If on main screen, show exit confirmation
      if (user && !showExitWarning) {
        e.preventDefault() // Only prevent default when we're handling it
        setShowExitWarning(true)
      }
    }

    window.addEventListener('popstate', handleBackButton)
    
    return () => {
      window.removeEventListener('popstate', handleBackButton)
    }
  }, [user, showPersonForm, selectedPerson, showExitWarning])

  const fetchAllRelationships = async () => {
    try {
      // Fetch all relationships for all people
      const allRels = await fetchRelationships()
      setAllRelationships(allRels || [])
    } catch (error) {
      console.error('Error fetching all relationships:', error)
    }
  }

  const getPersonRelationships = (personId) => {
    return allRelationships.filter(rel => 
      rel.person_a_id === personId || rel.person_b_id === personId 
    )
  }

  const handleAuthSuccess = (user) => {
    console.log('Authentication successful:', user)
    setAuthError(null)
    // The useSimpleAuth hook will handle setting the user state
  }

  const handleAuthError = (error) => {
    console.error('Authentication error:', error)
    setAuthError(error.message)
  }

  const handlePersonSubmit = async (personData) => {
    try {
      setFormSubmitError(null) // Clear previous errors
      
      if (editingPerson) {
        await updatePerson(editingPerson.id, personData)
      } else {
        await addPerson(personData)
      }
      
      setShowPersonForm(false)
      setEditingPerson(null)
      
      // Trigger refresh of all data
      triggerDataRefresh()
    } catch (error) {
      console.error('Error saving person:', error)
      setFormSubmitError(error.message || 'Failed to save person')
      // We're not closing the form - user can retry
      return false
    }
    return true
  }

  const handlePersonDelete = async (personId) => {
    if (window.confirm('Are you sure you want to delete this person? This will also remove all their relationships.')) {
      try {
        await deletePerson(personId)
        // Trigger refresh of all data
        triggerDataRefresh()
      } catch (error) {
        console.error('Error deleting person:', error)
      }
    }
  }

  const handleAddPersonFromRelationship = async (personData) => {
    try {
      const newPerson = await addPerson(personData)
      // Trigger refresh of all data
      triggerDataRefresh()
      return newPerson
    } catch (error) {
      console.error('Error adding person from relationship:', error)
      throw error
    }
  }

  const handleSearch = async (query) => {
    // Only perform search if query is different from current one
    if (query !== searchQuery) {
      setSearchQuery(query)
      setIsSearching(true)
      setSearchLoading(true)
      try {
        const results = await searchPeople(query)
        setSearchResults(results)
      } catch (error) {
        console.error('Error searching:', error)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearching(false)
    setSearchLoading(false)
  }

  const handleExitConfirm = () => {
    setShowExitWarning(false)
    window.close() // Attempt to close the window
  }

  const handleExitCancel = () => {
    setShowExitWarning(false)
    // We don't need to add history entry here anymore
  }

  // Handler for when relationship modal closes - refresh data
  const handleRelationshipModalClose = () => {
    setSelectedPerson(null)
    triggerDataRefresh()
  }

  // Handle proximity filter change and trigger refresh
  const handleProximityFilterChange = (value) => {
    setProximityFilter(value)
    // Force a re-render by setting a new array reference for displayedPeople
    // This ensures the cards re-sort immediately
    if (isSearching) {
      setSearchResults([...searchResults])
    }
  }

  // Filter people by proximity
  const getFilteredPeople = () => {
    let filtered = isSearching ? searchResults : people
    
    if (proximityFilter !== 'all') {
      // FIXED: Make case-insensitive comparison for proximity filter
      const filterValue = proximityFilter.charAt(0).toUpperCase() + proximityFilter.slice(1).toLowerCase()
      filtered = filtered.filter(p => {
        const personProximity = p.proximity || 'Medium'
        return personProximity === filterValue
      })
    }
    
    // Sort by proximity (Close first, then Medium, then Far)
    return filtered.sort((a, b) => {
      const proximityOrder = {
        'Close': 1,
        'Medium': 2,
        'Far': 3
      }
      const aOrder = proximityOrder[a.proximity || 'Medium'] || 2
      const bOrder = proximityOrder[b.proximity || 'Medium'] || 2
      return aOrder - bOrder
    })
  }

  // Compute filtered and sorted people list - will re-compute when dependencies change
  const displayedPeople = getFilteredPeople()

  const getProximityColor = (proximity) => {
    switch ((proximity || '').toLowerCase()) {
      case 'close': return 'bg-green-100 text-green-700 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'far': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onAuthSuccess={handleAuthSuccess} onAuthError={handleAuthError} authError={authError} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiUsers} className="text-2xl sm:text-3xl text-blue-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Relationship Tracker</h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 rounded-lg flex items-center space-x-1 transition-colors ${
                  proximityFilter !== 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <SafeIcon icon={FiFilter} />
                <span className="hidden sm:inline">Filter</span>
                {proximityFilter !== 'all' && (
                  <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">1</span>
                )}
              </button>

              <button
                onClick={() => { triggerDataRefresh() }}
                disabled={loading}
                className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
              >
                <SafeIcon icon={FiRefreshCw} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => {
                  setShowPersonForm(true)
                  setFormSubmitError(null) // Clear any previous errors
                }}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <SafeIcon icon={FiPlus} />
                <span className="hidden sm:inline">Add Person</span>
              </button>

              <UserProfile user={user} onSignOut={signOut} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="max-w-md w-full">
              <SearchBar onSearch={handleSearch} onClear={handleClearSearch} />
            </div>

            {/* Proximity Filter */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 sm:mt-0"
                >
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiMapPin} className="text-gray-500" />
                    <span className="text-sm text-gray-700">Proximity:</span>
                    <div className="flex space-x-1">
                      {['all', 'close', 'medium', 'far'].map(option => (
                        <button
                          key={option}
                          onClick={() => handleProximityFilterChange(option)}
                          className={`px-2 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                            proximityFilter === option
                              ? option === 'all' ? 'bg-gray-700 text-white' : getProximityColor(option)
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {proximityFilter !== 'all' && (
                      <button
                        onClick={() => handleProximityFilterChange('all')}
                        className="text-gray-500 hover:text-gray-700"
                        title="Clear filter"
                      >
                        <SafeIcon icon={FiX} size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Form Submit Error */}
        {formSubmitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Form Error: {formSubmitError}</p>
          </div>
        )}

        {/* Search status indicator */}
        {isSearching && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-blue-800">
                {searchLoading ? 'Searching...' : `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
              </p>
              {searchLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>
        )}

        {/* Proximity filter indicator */}
        {proximityFilter !== 'all' && !isSearching && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SafeIcon icon={FiFilter} className="text-blue-600" />
                <p className="text-blue-800">
                  Showing {displayedPeople.length} {proximityFilter} contact{displayedPeople.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => handleProximityFilterChange('all')}
                className="text-blue-600 hover:text-blue-800"
                title="Clear filter"
              >
                <SafeIcon icon={FiX} />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence>
            {displayedPeople.map(person => (
              <PersonCard
                key={`${person.id}-${person.proximity}`} // Add proximity to key to force re-render when it changes
                person={person}
                relationships={getPersonRelationships(person.id)}
                people={people}
                onEdit={(person) => {
                  setEditingPerson(person)
                  setShowPersonForm(true)
                  setFormSubmitError(null) // Clear any previous errors
                }}
                onDelete={handlePersonDelete}
                onViewRelationships={(person) => {
                  setSelectedPerson(person)
                }}
              />
            ))}
          </AnimatePresence>
        </div>

        {(loading || searchLoading) && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{searchLoading ? 'Searching...' : 'Loading people...'}</p>
          </div>
        )}

        {!loading && !searchLoading && displayedPeople.length === 0 && (
          <div className="text-center py-12">
            <SafeIcon icon={FiUsers} className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {isSearching
                ? 'No people found matching your search.'
                : proximityFilter !== 'all'
                ? `No ${proximityFilter} contacts found.`
                : 'No people recorded yet.'}
            </p>
            {!isSearching && proximityFilter === 'all' && (
              <p className="text-gray-500 mt-2">
                Click "Add Person" to get started tracking relationships.
              </p>
            )}
            {proximityFilter !== 'all' && (
              <button
                onClick={() => handleProximityFilterChange('all')}
                className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Show all contacts
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPersonForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 fixed-modal"
          >
            <PersonForm
              person={editingPerson}
              onSubmit={handlePersonSubmit}
              onCancel={() => {
                setShowPersonForm(false)
                setEditingPerson(null)
                setFormSubmitError(null)
              }}
            />
          </motion.div>
        )}

        {selectedPerson && (
          <RelationshipModal
            person={selectedPerson}
            people={people}
            onClose={handleRelationshipModalClose}
            onAddPerson={handleAddPersonFromRelationship}
          />
        )}

        {showExitWarning && (
          <ExitWarning
            onConfirm={handleExitConfirm}
            onCancel={handleExitCancel}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App