import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { getRelationshipBasedOnSex, getOppositeRelationship, getBaseRelationshipType } from '../utils/relationshipMappings'

// People hook
export const usePeople = () => {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPeople = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development
      console.log('Fetching people for user:', userId)

      const { data, error } = await supabase
        .from('people_tracker_2024')
        .select('*')
        .eq('user_id', userId)
        .order('name')

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Fetched people:', data?.length || 0)
      setPeople(data || [])
      return data || []
    } catch (err) {
      console.error('Error fetching people:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  const searchPeople = async (query) => {
    try {
      setLoading(true)
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development

      // Split the query into individual words and create search patterns
      const words = query.trim().split(/\s+/).filter(word => word.length > 0)
      if (words.length === 0) {
        return []
      }

      // Create search conditions for each word with wildcards
      const searchConditions = words.map(word => {
        const wildcardWord = `%${word}%`
        return `name.ilike.${wildcardWord},nicknames.ilike.${wildcardWord},notes.ilike.${wildcardWord}`
      }).join(',')

      console.log('Search query:', query)
      console.log('Search words:', words)
      console.log('Search conditions:', searchConditions)

      const { data, error } = await supabase
        .from('people_tracker_2024')
        .select('*')
        .eq('user_id', userId)
        .or(searchConditions)
        .order('name')

      if (error) throw error

      // Additional client-side filtering for multi-word searches
      // This ensures ALL words must match somewhere in the person's data
      const filteredData = (data || []).filter(person => {
        const searchText = `${person.name} ${person.nicknames || ''} ${person.notes || ''}`.toLowerCase()
        return words.every(word => searchText.includes(word.toLowerCase()))
      })

      return filteredData
    } catch (err) {
      console.error('Error searching people:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  const uploadPhoto = async (file, personId) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${personId}_${Date.now()}.${fileExt}`
      const filePath = `photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('person-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('person-photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      throw error
    }
  }

  const addPerson = async (personData) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development

      // Prepare the data without the photo file
      const { photoFile, ...dataToInsert } = personData
      dataToInsert.user_id = userId

      // CRITICAL FIX: Ensure proximity value has the correct case (Title Case)
      // This prevents the database constraint violation
      const validProximities = ['Close', 'Medium', 'Far']
      if (!validProximities.includes(dataToInsert.proximity)) {
        dataToInsert.proximity = 'Medium' // Default value with proper case
      }

      console.log("Adding person with data:", dataToInsert)

      // First insert the person to get the ID
      const { data, error } = await supabase
        .from('people_tracker_2024')
        .insert([dataToInsert])
        .select()

      if (error) {
        console.error("Insert error:", error)
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert')
      }

      let finalPerson = data[0]

      // If there's a photo file, upload it and update the person
      if (photoFile) {
        try {
          const photoUrl = await uploadPhoto(photoFile, finalPerson.id)
          
          const { data: updatedData, error: updateError } = await supabase
            .from('people_tracker_2024')
            .update({ photo_url: photoUrl })
            .eq('id', finalPerson.id)
            .select()

          if (updateError) throw updateError
          finalPerson = updatedData[0]
        } catch (photoError) {
          console.error('Error uploading photo:', photoError)
          // Continue without photo if upload fails
        }
      }

      // Update the local state with the new person
      setPeople(prev => [...prev, finalPerson])
      
      return finalPerson
    } catch (err) {
      console.error('Error adding person:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updatePerson = async (id, personData) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development

      // Prepare the data without the photo file
      const { photoFile, ...dataToUpdate } = personData
      dataToUpdate.updated_at = new Date().toISOString()

      // CRITICAL FIX: Ensure proximity value has the correct case (Title Case)
      // This prevents the database constraint violation
      const validProximities = ['Close', 'Medium', 'Far']
      if (!validProximities.includes(dataToUpdate.proximity)) {
        dataToUpdate.proximity = 'Medium' // Default value with proper case
      }

      console.log("Updating person with data:", dataToUpdate)

      // If there's a photo file, upload it first
      if (photoFile) {
        try {
          const photoUrl = await uploadPhoto(photoFile, id)
          dataToUpdate.photo_url = photoUrl
        } catch (photoError) {
          console.error('Error uploading photo:', photoError)
          // Continue without photo update if upload fails
        }
      }

      const { data, error } = await supabase
        .from('people_tracker_2024')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('user_id', userId)
        .select()

      if (error) {
        console.error("Update error:", error)
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error('Person not found or not updated')
      }

      setPeople(prev => prev.map(p => p.id === id ? data[0] : p))
      return data[0]
    } catch (err) {
      console.error('Error updating person:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deletePerson = async (id) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development

      const { error } = await supabase
        .from('people_tracker_2024')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error

      setPeople(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Error deleting person:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    people,
    loading,
    error,
    fetchPeople,
    searchPeople,
    addPerson,
    updatePerson,
    deletePerson
  }
}

// Relationships hook with improved error handling
export const useRelationships = () => {
  const [relationships, setRelationships] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRelationships = async (personId = null) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development

      let query = supabase
        .from('relationships_tracker_2024')
        .select(`
          *,
          person_a:people_tracker_2024!relationships_tracker_2024_person_a_id_fkey(id,name,sex),
          person_b:people_tracker_2024!relationships_tracker_2024_person_b_id_fkey(id,name,sex)
        `)
        .eq('user_id', userId)

      if (personId) {
        query = query.or(`person_a_id.eq.${personId},person_b_id.eq.${personId}`)
      }

      const { data, error } = await query

      if (error) {
        console.error("Database error:", error)
        throw error
      }

      console.log("Fetched relationships:", data)
      setRelationships(data || [])
      return data || []
    } catch (error) {
      console.error('Error fetching relationships:', error)
      setError(error.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // FIXED: Now the relationship type represents what the OTHER person is to the CURRENT person
  const addRelationship = async (currentPersonId, otherPersonId, relationshipTypeOfOtherPerson) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development

      console.log('Adding relationship:', { currentPersonId, otherPersonId, relationshipTypeOfOtherPerson: relationshipTypeOfOtherPerson, userId })

      // Get both people's details
      const { data: peopleData, error: peopleError } = await supabase
        .from('people_tracker_2024')
        .select('id,name,sex')
        .in('id', [currentPersonId, otherPersonId])

      if (peopleError) {
        console.error("People fetch error:", peopleError)
        throw peopleError
      }

      console.log("People data:", peopleData)
      const currentPerson = peopleData.find(p => p.id === currentPersonId)
      const otherPerson = peopleData.find(p => p.id === otherPersonId)

      if (!currentPerson || !otherPerson) {
        throw new Error('Could not find both people')
      }

      console.log("Current person:", currentPerson.name, currentPerson.sex)
      console.log("Other person:", otherPerson.name, otherPerson.sex)
      console.log("What the other person is to current person:", relationshipTypeOfOtherPerson)

      // FIXED LOGIC:
      // - relationshipTypeOfOtherPerson = what the OTHER person is to the CURRENT person
      // - We need to find what the CURRENT person is to the OTHER person (opposite)
      const oppositeBaseType = getOppositeRelationship(relationshipTypeOfOtherPerson, null)
      console.log('What current person is to other person (base):', oppositeBaseType)

      // Apply sex-specific transformations
      // What the OTHER person is to the CURRENT person (based on other person's sex)
      const otherToCurrentRelationship = getRelationshipBasedOnSex(relationshipTypeOfOtherPerson, otherPerson.sex)
      // What the CURRENT person is to the OTHER person (based on current person's sex)
      const currentToOtherRelationship = getRelationshipBasedOnSex(oppositeBaseType, currentPerson.sex)

      console.log('Other person to current person (specific):', otherToCurrentRelationship)
      console.log('Current person to other person (specific):', currentToOtherRelationship)

      // Store the relationship with current person as person_a and other person as person_b
      const relationshipData = {
        user_id: userId,
        person_a_id: currentPersonId,
        person_b_id: otherPersonId,
        relationship_type: currentToOtherRelationship, // What current person (A) is to other person (B)
        relationship_type_b: otherToCurrentRelationship // What other person (B) is to current person (A)
      }

      console.log('Final relationship data:', relationshipData)

      // Insert the new relationship
      const { data, error } = await supabase
        .from('relationships_tracker_2024')
        .insert([relationshipData])
        .select()

      if (error) {
        console.error("Insert error:", error)
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert')
      }

      console.log('Relationship added:', data[0])

      // Update local state
      const newRelationship = data[0]
      setRelationships(prev => [...prev, newRelationship])
      return newRelationship
    } catch (error) {
      console.error('Error adding relationship:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Updated to match the new logic
  const updateRelationship = async (relationshipId, updateData) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development

      console.log('Updating relationship:', { relationshipId, updateData })

      // Get the existing relationship
      const { data: existingRel, error: fetchError } = await supabase
        .from('relationships_tracker_2024')
        .select(`
          *,
          person_a:people_tracker_2024!relationships_tracker_2024_person_a_id_fkey(id,name,sex),
          person_b:people_tracker_2024!relationships_tracker_2024_person_b_id_fkey(id,name,sex)
        `)
        .eq('id', relationshipId)
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        console.error("Fetch error:", fetchError)
        throw fetchError
      }

      if (!existingRel) {
        throw new Error('Relationship not found')
      }

      console.log('Existing relationship:', existingRel)
      console.log('Person A:', existingRel.person_a.name, existingRel.person_a.sex)
      console.log('Person B:', existingRel.person_b.name, existingRel.person_b.sex)
      console.log('New relationship type (what B is to A):', updateData.relationshipType)

      // FIXED: The updateData.relationshipType represents what person B is to person A
      const oppositeBaseType = getOppositeRelationship(updateData.relationshipType, null)
      console.log('What person A is to person B (base):', oppositeBaseType)

      // Apply sex-specific transformations
      // What person B is to person A (based on person B's sex)
      const personBToPersonA = getRelationshipBasedOnSex(updateData.relationshipType, existingRel.person_b.sex)
      // What person A is to person B (based on person A's sex)
      const personAToPersonB = getRelationshipBasedOnSex(oppositeBaseType, existingRel.person_a.sex)

      console.log('Person A to Person B (specific):', personAToPersonB)
      console.log('Person B to Person A (specific):', personBToPersonA)

      // Create update object
      const updateObj = {
        relationship_type: personAToPersonB, // What person A is to person B
        relationship_type_b: personBToPersonA, // What person B is to person A
        updated_at: new Date().toISOString()
      }

      console.log('Update object:', updateObj)

      // Update the relationship
      const { data, error } = await supabase
        .from('relationships_tracker_2024')
        .update(updateObj)
        .eq('id', relationshipId)
        .eq('user_id', userId)
        .select()

      if (error) {
        console.error("Update error:", error)
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from update')
      }

      console.log('Updated relationship:', data[0])

      // Update local state
      const updatedRelationship = data[0]
      setRelationships(prev => prev.map(r => r.id === relationshipId ? updatedRelationship : r))
      return updatedRelationship
    } catch (error) {
      console.error('Error updating relationship:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteRelationship = async (relationshipId) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous' // Fallback for development

      const { error } = await supabase
        .from('relationships_tracker_2024')
        .delete()
        .eq('id', relationshipId)
        .eq('user_id', userId)

      if (error) {
        console.error("Delete error:", error)
        throw error
      }

      // Update local state
      setRelationships(prev => prev.filter(r => r.id !== relationshipId))
    } catch (error) {
      console.error('Error deleting relationship:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    relationships,
    loading,
    error,
    fetchRelationships,
    addRelationship,
    updateRelationship,
    deleteRelationship
  }
}