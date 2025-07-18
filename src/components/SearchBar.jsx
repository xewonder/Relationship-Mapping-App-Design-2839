import React, { useState, useEffect } from 'react'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'

const { FiSearch, FiX } = FiIcons

const SearchBar = ({ onSearch, onClear }) => {
  const [query, setQuery] = useState('')

  // Real-time search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        onSearch(query.trim())
      } else {
        onClear()
      }
    }, 300) // 300ms debounce to avoid too many API calls

    return () => clearTimeout(timeoutId)
  }, [query, onSearch, onClear])

  const handleSubmit = (e) => {
    e.preventDefault()
    // Still handle form submission for accessibility
    if (query.trim()) {
      onSearch(query.trim())
    } else {
      onClear()
    }
  }

  const handleClear = () => {
    setQuery('')
    onClear()
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search by name, nicknames, or notes..."
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <SafeIcon icon={FiX} />
          </button>
        )}
      </div>
    </form>
  )
}

export default SearchBar