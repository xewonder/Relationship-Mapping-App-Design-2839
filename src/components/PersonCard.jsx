import React, {useState, useEffect} from 'react'
import {motion, AnimatePresence} from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'

const {FiEdit, FiTrash2, FiUsers, FiHeart, FiHome, FiBriefcase, FiChevronDown, FiChevronUp, FiUser, FiMapPin} = FiIcons

const PersonCard = ({person, relationships = [], people = [], onEdit, onDelete, onViewRelationships}) => {
  const [showRelationships, setShowRelationships] = useState(false)
  const [imageError, setImageError] = useState(false)
  // Added to force re-render when proximity changes
  const [proximityValue, setProximityValue] = useState(person.proximity || 'Medium')
  
  // Update proximity when person prop changes
  useEffect(() => {
    if (person.proximity !== proximityValue) {
      setProximityValue(person.proximity || 'Medium')
    }
  }, [person, person.proximity, proximityValue])

  const getSexIcon = (sex) => {
    switch (sex) {
      case 'male': return '♂️'
      case 'female': return '♀️'
      default: return '⚧️'
    }
  }

  const getProximityColor = (proximity) => {
    switch ((proximity || '').toLowerCase()) {
      case 'close': return 'bg-green-100 text-green-700 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'far': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getFamilyIcon = (relationshipType) => {
    const familyTypes = ['father', 'mother', 'son', 'daughter', 'brother', 'sister', 'grandfather', 'grandmother', 'grandson', 'granddaughter', 'uncle', 'aunt', 'nephew', 'niece', 'husband', 'wife', 'ex-husband', 'ex-wife']
    const friendTypes = ['friend']
    const workTypes = ['colleague', 'boss', 'employee']

    if (familyTypes.includes(relationshipType)) return FiHome
    if (friendTypes.includes(relationshipType)) return FiHeart
    if (workTypes.includes(relationshipType)) return FiBriefcase
    return FiUsers
  }

  // Get relationship details with correct perspective
  const getRelationshipDetails = () => {
    return relationships.map(rel => {
      const isPersonA = rel.person_a?.id === person.id || rel.person_a_id === person.id
      const relatedPersonId = isPersonA ? (rel.person_b?.id || rel.person_b_id) : (rel.person_a?.id || rel.person_a_id)
      const relatedPersonName = isPersonA ? (rel.person_b?.name) : (rel.person_a?.name)

      // If we don't have the name from the relationship object, find it in the people array
      let personName = relatedPersonName
      if (!personName) {
        const relatedPerson = people.find(p => p.id === relatedPersonId)
        personName = relatedPerson?.name || 'Unknown'
      }

      // Get the correct relationship type from the current person's perspective
      // If this person is person_A, we want relationship_type_b (what person_B is to person_A)
      // If this person is person_B, we want relationship_type (what person_A is to person_B)
      const relationshipType = isPersonA ? (rel.relationship_type_b || rel.relationship_type) // What person B is to person A
                                         : rel.relationship_type // What person A is to person B

      return {
        name: personName,
        type: relationshipType,
        icon: getFamilyIcon(relationshipType)
      }
    })
  }

  const relationshipDetails = getRelationshipDetails()
  const relationshipCount = relationshipDetails.length

  // Toggle this card's relationship display only
  const toggleRelationships = (e) => {
    e.stopPropagation() // Prevent event bubbling
    setShowRelationships(!showRelationships)
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const renderPhoto = () => {
    if (person.photo_url && !imageError) {
      return (
        <img 
          src={person.photo_url} 
          alt={person.name} 
          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
          onError={handleImageError}
        />
      )
    }

    return (
      <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
        <SafeIcon icon={FiUser} className="text-gray-400 text-xl" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      whileHover={{y: -2}}
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
      key={`${person.id}-${proximityValue}`} // Force re-render when proximity changes
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {renderPhoto()}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <span>{person.name}</span>
              <span className="text-sm">{getSexIcon(person.sex)}</span>
            </h3>
            {/* Proximity Badge */}
            <div className="flex items-center mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center ${getProximityColor(proximityValue)}`}>
                <SafeIcon icon={FiMapPin} className="mr-1" size={10} />
                <span className="capitalize">{proximityValue}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onViewRelationships(person)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="View Relationships"
          >
            <SafeIcon icon={FiUsers} size={18} />
          </button>
          <button
            onClick={() => onEdit(person)}
            className="text-green-600 hover:text-green-800 transition-colors"
            title="Edit"
          >
            <SafeIcon icon={FiEdit} size={18} />
          </button>
          <button
            onClick={() => onDelete(person.id)}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Delete"
          >
            <SafeIcon icon={FiTrash2} size={18} />
          </button>
        </div>
      </div>

      {person.nicknames && (
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-medium">Nicknames:</span> {person.nicknames}
        </p>
      )}

      {relationshipCount > 0 && (
        <div className="mb-2">
          <button
            onClick={toggleRelationships}
            className="flex items-center justify-between w-full py-1 px-2 bg-gray-50 hover:bg-gray-100 rounded text-sm transition-colors"
          >
            <span className="flex items-center">
              <SafeIcon icon={FiUsers} className="text-gray-500 mr-1" size={14} />
              <span className="text-gray-700 font-medium">
                {relationshipCount} Relationship{relationshipCount !== 1 ? 's' : ''}
              </span>
            </span>
            <SafeIcon
              icon={showRelationships ? FiChevronUp : FiChevronDown}
              className="text-gray-500"
              size={16}
            />
          </button>

          <AnimatePresence>
            {showRelationships && (
              <motion.div
                initial={{opacity: 0, height: 0}}
                animate={{opacity: 1, height: 'auto'}}
                exit={{opacity: 0, height: 0}}
                transition={{duration: 0.2}}
                className="overflow-hidden"
              >
                <div className="pt-2 pb-1 space-y-1">
                  {relationshipDetails.map((rel, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm pl-2">
                      <SafeIcon icon={rel.icon} className="text-gray-500 flex-shrink-0" size={14} />
                      <span className="text-gray-700 truncate">
                        <span className="font-medium">{rel.name}</span>
                        <span className="text-gray-500 ml-1">({rel.type})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {person.notes && (
        <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
          <span className="font-medium">Notes:</span> {person.notes}
        </p>
      )}
    </motion.div>
  )
}

export default PersonCard