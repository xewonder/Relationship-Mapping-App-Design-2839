import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import PersonForm from './PersonForm'

const { FiSave, FiX, FiPlus, FiUser, FiSearch, FiEdit, FiFilter } = FiIcons

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

const RelationshipForm = ({ person, people, existingRelationships = [], onSubmit, onCancel, onAddPerson }) => {
  const [relationships, setRelationships] = useState([{ relatedPersonId: '', relationshipType: '', showSearch: true }])
  const [showAddPersonForm, setShowAddPersonForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearchIndex, setActiveSearchIndex] = useState(0) // Track which relationship is being searched
  const [peopleFilter, setPeopleFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [allAvailablePeople, setAllAvailablePeople] = useState([])
  const [historyHandled, setHistoryHandled] = useState(false)
  const bottomRef = useRef(null)
  const formRef = useRef(null)

  // Prevent back button from exiting app - OPTIMIZED
  useEffect(() => {
    if (historyHandled) return;
    
    const handleBackButton = () => {
      onCancel();
    };
    
    window.addEventListener('popstate', handleBackButton);
    
    // Only add history entry once
    if (!historyHandled) {
      window.history.pushState({ action: 'relationshipForm' }, '');
      setHistoryHandled(true);
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onCancel, historyHandled]);

  // Initialize available people
  useEffect(() => {
    const existingPersonIds = existingRelationships.map(rel => 
      rel.person_a_id === person.id ? rel.person_b_id : rel.person_a_id 
    );
    
    const filtered = people.filter(p => 
      p.id !== person.id && !existingPersonIds.includes(p.id) 
    );
    
    const sorted = filtered.sort((a, b) => {
      const proximityOrder = { close: 1, medium: 2, far: 3 };
      const aOrder = proximityOrder[(a.proximity || 'medium').toLowerCase()] || 2;
      const bOrder = proximityOrder[(b.proximity || 'medium').toLowerCase()] || 2;
      return aOrder - bOrder;
    });
    
    setAllAvailablePeople(sorted);
  }, [person, people, existingRelationships]);

  // Scroll to bottom when form opens or relationships change
  useEffect(() => {
    if (bottomRef.current) {
      setTimeout(() => {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [relationships.length]);

  const getAvailablePeople = () => {
    let filtered = [...allAvailablePeople];
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) || 
        (p.nicknames && p.nicknames.toLowerCase().includes(search))
      );
    }
    
    if (peopleFilter !== 'all') {
      filtered = filtered.filter(p => 
        (p.proximity || '').toLowerCase() === peopleFilter.toLowerCase()
      );
    }
    
    return filtered;
  }

  const availablePeople = getAvailablePeople();

  const addRelationshipRow = () => {
    setRelationships([...relationships, { relatedPersonId: '', relationshipType: '', showSearch: true }]);
    
    // Move search focus to the new row
    setActiveSearchIndex(relationships.length);
    setSearchTerm('');
  }

  const removeRelationshipRow = (index) => {
    const newRelationships = relationships.filter((_, i) => i !== index);
    setRelationships(newRelationships);
    
    // Adjust active search index if needed
    if (index <= activeSearchIndex) {
      const newIndex = Math.max(0, activeSearchIndex - 1);
      setActiveSearchIndex(newIndex);
    }
    
    setSearchTerm('');
  }

  const updateRelationship = (index, field, value) => {
    const updated = relationships.map((rel, i) => {
      if (i === index) {
        const updatedRel = { ...rel, [field]: value };
        
        if (field === 'relatedPersonId' && value) {
          updatedRel.showSearch = false;
          
          // Move search to next empty relationship
          const nextEmptyIndex = relationships.findIndex((r, idx) => idx > index && !r.relatedPersonId);
          
          if (nextEmptyIndex !== -1) {
            setActiveSearchIndex(nextEmptyIndex);
          } else {
            // If no empty relationships, add a new one
            addRelationshipRow();
          }
          
          setSearchTerm('');
        }
        
        return updatedRel;
      }
      
      return rel;
    });
    
    setRelationships(updated);
  }

  const toggleSearch = (index) => {
    const updated = relationships.map((rel, i) => 
      i === index ? { ...rel, showSearch: !rel.showSearch } : rel 
    );
    
    setRelationships(updated);
    setActiveSearchIndex(index);
    setSearchTerm('');
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validRelationships = relationships.filter(rel => 
      rel.relatedPersonId && rel.relationshipType 
    );
    
    if (validRelationships.length > 0) {
      onSubmit(validRelationships);
    }
  }

  const handleAddNewPerson = async (personData) => {
    try {
      const newPerson = await onAddPerson(personData);
      setShowAddPersonForm(false);
      
      const emptyIndex = relationships.findIndex(rel => !rel.relatedPersonId);
      
      if (emptyIndex >= 0) {
        updateRelationship(emptyIndex, 'relatedPersonId', newPerson.id);
      }
      
      setAllAvailablePeople(prev => [newPerson, ...prev]);
    } catch (error) {
      console.error('Error adding person:', error);
    }
  }

  const getProximityColor = (proximity) => {
    switch ((proximity || '').toLowerCase()) {
      case 'close': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'far': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  const getProximityLabel = (proximity) => {
    return proximity ? proximity.charAt(0).toUpperCase() + proximity.slice(1).toLowerCase() : 'Unknown';
  }

  const getPersonById = (personId) => {
    let foundPerson = availablePeople.find(p => p.id === personId);
    
    if (!foundPerson && personId) {
      foundPerson = allAvailablePeople.find(p => p.id === personId);
    }
    
    return foundPerson;
  }

  if (showAddPersonForm) {
    return (
      <PersonForm
        onSubmit={handleAddNewPerson}
        onCancel={() => setShowAddPersonForm(false)}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-lg w-full mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
      ref={formRef}
    >
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Add Relationships for {person.name}
      </h2>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>How to use:</strong> Select what the other person is to <strong>{person.name}</strong>. For example, if you're adding {person.name}'s father, select "Parent".
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Filters */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg ${showFilters || peopleFilter !== 'all' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title="Filter by proximity"
          >
            <SafeIcon icon={FiFilter} />
          </button>
          
          {showFilters && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Filter by proximity:</p>
              <div className="flex flex-wrap gap-2">
                {['all', 'close', 'medium', 'far'].map(filter => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setPeopleFilter(filter)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                      peopleFilter === filter
                        ? filter === 'all' ? 'bg-gray-700 text-white' : getProximityColor(filter)
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {relationships.map((relationship, index) => {
          const selectedPerson = getPersonById(relationship.relatedPersonId);
          const isActiveSearch = index === activeSearchIndex;
          
          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700">Relationship {index + 1}</h3>
                {relationships.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRelationshipRow(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <SafeIcon icon={FiX} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Person selection - Full width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Person
                  </label>
                  <div className="space-y-2">
                    {selectedPerson && !relationship.showSearch ? (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <SafeIcon icon={FiUser} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{selectedPerson.name}</p>
                            {selectedPerson.proximity && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getProximityColor(selectedPerson.proximity)}`}>
                                {getProximityLabel(selectedPerson.proximity)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSearch(index)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Change person"
                        >
                          <SafeIcon icon={FiEdit} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <select
                            value={relationship.relatedPersonId}
                            onChange={(e) => updateRelationship(index, 'relatedPersonId', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select a person</option>
                            {availablePeople.length > 0 ? (
                              availablePeople.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.proximity && ` (${getProximityLabel(p.proximity)})`}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>No people available</option>
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowAddPersonForm(true)}
                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors flex-shrink-0"
                            title="Add new person"
                          >
                            <SafeIcon icon={FiPlus} />
                          </button>
                        </div>
                        
                        {/* Only show search box for active relationship */}
                        {isActiveSearch && (
                          <div className="relative">
                            <SafeIcon
                              icon={FiSearch}
                              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Search people..."
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            {searchTerm && availablePeople.length === 0 && (
                              <p className="mt-1 text-xs text-orange-600">
                                No people match your search. Try a different term or add a new person.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Relationship type - Full width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What are they to {person.name}?
                  </label>
                  <select
                    value={relationship.relationshipType}
                    onChange={(e) => updateRelationship(index, 'relationshipType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select relationship</option>
                    {relationshipOptions.map(option => (
                      <option key={option.type} value={option.type}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )
        })}

        <button
          type="button"
          onClick={addRelationshipRow}
          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
        >
          <SafeIcon icon={FiPlus} />
          <span>Add Another Relationship</span>
        </button>

        <div className="flex space-x-3 pt-4" ref={bottomRef}>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <SafeIcon icon={FiSave} />
            <span>Save Relationships</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors flex items-center justify-center space-x-2"
          >
            <SafeIcon icon={FiX} />
            <span>Cancel</span>
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default RelationshipForm