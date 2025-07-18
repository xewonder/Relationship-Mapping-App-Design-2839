// Define relationship mappings based on sex
export const getRelationshipBasedOnSex = (type, sex) => {
  const sexBasedRelationships = {
    // Siblings
    'sibling': {
      'male': 'brother',
      'female': 'sister',
      'other': 'sibling'
    },
    
    // Spouse
    'spouse': {
      'male': 'husband',
      'female': 'wife',
      'other': 'spouse'
    },
    
    // Ex-spouse
    'ex_spouse': {
      'male': 'ex-husband',
      'female': 'ex-wife',
      'other': 'ex-spouse'
    },
    
    // Parent
    'parent': {
      'male': 'father',
      'female': 'mother',
      'other': 'parent'
    },
    
    // Child
    'child': {
      'male': 'son',
      'female': 'daughter',
      'other': 'child'
    },
    
    // Grandparent
    'grandparent': {
      'male': 'grandfather',
      'female': 'grandmother',
      'other': 'grandparent'
    },
    
    // Grandchild
    'grandchild': {
      'male': 'grandson',
      'female': 'granddaughter',
      'other': 'grandchild'
    },
    
    // Aunt/Uncle
    'parental_sibling': {
      'male': 'uncle',
      'female': 'aunt',
      'other': 'parent\'s sibling'
    },
    
    // Niece/Nephew
    'sibling_child': {
      'male': 'nephew',
      'female': 'niece',
      'other': 'sibling\'s child'
    }
  }

  // Return the specific relationship based on sex, or the original type if not found
  return sexBasedRelationships[type]?.[sex] || type
}

// Get the opposite relationship type
export const getOppositeRelationship = (relationship, sex) => {
  const oppositeMap = {
    // Base types to base types - FIXED THESE RELATIONSHIPS
    'sibling': 'sibling',
    'spouse': 'spouse',
    'ex_spouse': 'ex_spouse',
    'parent': 'child',
    'child': 'parent',
    'grandparent': 'grandchild',
    'grandchild': 'grandparent',
    'parental_sibling': 'sibling_child',
    'sibling_child': 'parental_sibling',
    'friend': 'friend',
    'colleague': 'colleague',
    'boss': 'employee',
    'employee': 'boss',
    
    // Also handle specific types for robustness
    'brother': 'sibling',
    'sister': 'sibling',
    'husband': 'spouse',
    'wife': 'spouse',
    'ex-husband': 'ex_spouse',
    'ex-wife': 'ex_spouse',
    'father': 'child',
    'mother': 'child',
    'son': 'parent',
    'daughter': 'parent',
    'grandfather': 'grandchild',
    'grandmother': 'grandchild',
    'grandson': 'grandparent',
    'granddaughter': 'grandparent',
    'uncle': 'sibling_child',
    'aunt': 'sibling_child',
    'nephew': 'parental_sibling',
    'niece': 'parental_sibling'
  }

  // First get the base opposite type
  const baseType = oppositeMap[relationship] || relationship

  // Then convert to sex-specific if needed
  return sex ? getRelationshipBasedOnSex(baseType, sex) : baseType
}

// Helper function to get the base relationship type from specific types
export const getBaseRelationshipType = (specificType) => {
  const typeMap = {
    'brother': 'sibling',
    'sister': 'sibling',
    'husband': 'spouse',
    'wife': 'spouse',
    'ex-husband': 'ex_spouse',
    'ex-wife': 'ex_spouse',
    'father': 'parent',
    'mother': 'parent',
    'son': 'child',
    'daughter': 'child',
    'grandfather': 'grandparent',
    'grandmother': 'grandparent',
    'grandson': 'grandchild',
    'granddaughter': 'grandchild',
    'uncle': 'parental_sibling',
    'aunt': 'parental_sibling',
    'nephew': 'sibling_child',
    'niece': 'sibling_child'
  }

  return typeMap[specificType] || specificType
}

// Get relationship from person A's perspective to person B
export const getRelationshipFromPerspective = (relationshipType, personASex, personBSex, isPersonAPerspective) => {
  if (isPersonAPerspective) {
    // Person A's perspective: what is person B to person A?
    // First get the base opposite type
    const baseOppositeType = getOppositeRelationship(relationshipType, null)
    
    // Then apply person B's sex
    return getRelationshipBasedOnSex(baseOppositeType, personBSex)
  } else {
    // Person B's perspective: what is person A to person B?
    return getRelationshipBasedOnSex(relationshipType, personASex)
  }
}