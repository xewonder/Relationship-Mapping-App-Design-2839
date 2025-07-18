import React, {useState, useRef, useEffect} from 'react'
import {motion, AnimatePresence} from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'

const {FiSave, FiX, FiCamera, FiTrash2, FiUser, FiImage, FiLink} = FiIcons

const PersonForm = ({person, onSubmit, onCancel}) => {
  // Define valid proximity values with proper case - CRITICAL FIX
  const VALID_PROXIMITIES = ['Close', 'Medium', 'Far'];
  
  // Make sure we initialize with a valid proximity value (proper case)
  const getValidProximity = (value) => {
    if (!value) return 'Medium';
    
    // First convert to Title Case for comparison
    const titleCase = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    
    return VALID_PROXIMITIES.includes(titleCase) ? titleCase : 'Medium';
  };

  const [formData, setFormData] = useState({
    name: person?.name || '',
    sex: person?.sex || 'male',
    nicknames: person?.nicknames || '',
    notes: person?.notes || '',
    photo_url: person?.photo_url || '',
    proximity: getValidProximity(person?.proximity)
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(person?.photo_url || '')
  const [isUploading, setIsUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [isCameraSupported, setIsCameraSupported] = useState(true)
  const [formError, setFormError] = useState('')
  
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const bottomRef = useRef(null)
  const formRef = useRef(null)

  // Scroll to bottom when form opens
  useEffect(() => {
    if (bottomRef.current) {
      setTimeout(() => {
        bottomRef.current.scrollIntoView({behavior: 'smooth'});
      }, 100);
    }
  }, []);

  // Prevent back button from exiting app
  useEffect(() => {
    const handleBackButton = (event) => {
      event.preventDefault();
      onCancel();
    };
    window.addEventListener('popstate', handleBackButton);
    // Add history entry to make back button work
    window.history.pushState(null, null, window.location.pathname);
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onCancel]);

  const capitalizeWords = (str) => {
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('');
    
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    
    setIsUploading(true)
    try {
      // Create a copy of the form data
      let finalFormData = {...formData};
      
      // IMPORTANT: Force proximity to be a valid value with proper case
      if (!VALID_PROXIMITIES.includes(finalFormData.proximity)) {
        finalFormData.proximity = 'Medium';
      }
      
      console.log("Submitting person with data:", finalFormData);
      
      // If there's a photo file, we'll pass it along for upload
      if (photoFile) {
        finalFormData.photoFile = photoFile;
      }
      
      await onSubmit(finalFormData);
    } catch (error) {
      console.error('Error saving person:', error);
      setFormError(error.message || 'Failed to save person');
    } finally {
      setIsUploading(false);
    }
  }

  const handleChange = (e) => {
    const {name, value} = e.target;
    
    if (name === 'proximity') {
      console.log(`Setting proximity to: "${value}"`);
    }
    
    setFormData(prev => ({
      ...prev, 
      [name]: name === 'name' ? capitalizeWords(value) : value
    }));
  }
  
  // Set proximity with proper case
  const setProximity = (value) => {
    const titleCase = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    console.log(`Setting proximity to: "${titleCase}"`);
    setFormData(prev => ({...prev, proximity: titleCase}));
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo must be less than 5MB')
        return
      }
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      setPhotoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoUrlChange = (e) => {
    const url = e.target.value
    setFormData(prev => ({...prev, photo_url: url}))
    setPhotoPreview(url)
    setPhotoFile(null) // Clear file if URL is being used
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview('')
    setFormData(prev => ({...prev, photo_url: ''}))
  }

  // Camera functionality
  const startCamera = async () => {
    try {
      setCameraError('')
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsCameraSupported(false);
        setCameraError('Camera not supported on this device or browser');
        return;
      }

      // For Android compatibility, try with exact constraints first
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Important for iOS
          videoRef.current.setAttribute('autoplay', 'true');
          
          // Add event listener for when video can play
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => {
              console.error('Error playing video:', e);
              setCameraError('Could not start video stream');
            });
          };
        }
        
        setShowCamera(true);
      } catch (initialError) {
        console.error('Initial camera error, trying fallback:', initialError);
        
        // Fallback to basic constraints
        const fallbackConstraints = { video: true };
        const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => {
              console.error('Error playing video:', e);
              setCameraError('Could not start video stream');
            });
          };
        }
        
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Could not access camera. Please check permissions.');
      setIsCameraSupported(false);
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    try {
      const canvas = document.createElement('canvas');
      
      // Get the actual video dimensions
      const videoWidth = videoRef.current.videoWidth || 480;
      const videoHeight = videoRef.current.videoHeight || 480;
      
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert to file
      canvas.toBlob(blob => {
        if (!blob) {
          console.error('Could not capture image');
          return;
        }
        
        const file = new File([blob], `camera_photo_${Date.now()}.jpg`, {type: 'image/jpeg'});
        setPhotoFile(file);
        setPhotoPreview(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }, 'image/jpeg', 0.8);
    } catch (err) {
      console.error('Error capturing photo:', err);
    }
  }

  const getProximityColor = (proximity) => {
    switch (proximity.toLowerCase()) {
      case 'close': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'far': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Debug info
  console.log("Current form data:", formData);

  return (
    <motion.div 
      initial={{opacity: 0, y: 20}} 
      animate={{opacity: 1, y: 0}} 
      className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
      ref={formRef}
    >
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">
        {person ? 'Edit Person' : 'Add New Person'}
      </h2>
      
      {formError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{formError}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo
          </label>
          <div className="flex items-center space-x-4">
            {/* Photo Preview */}
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                  />
                  <button 
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <SafeIcon icon={FiX} size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                  <SafeIcon icon={FiUser} className="text-gray-400 text-2xl" />
                </div>
              )}
            </div>
            
            {/* Photo Options */}
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex space-x-2">
                {/* Camera Button */}
                {isCameraSupported && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <SafeIcon icon={FiCamera} size={16} />
                    <span className="text-sm">Camera</span>
                  </button>
                )}
                
                {/* Upload Button */}
                <label className="flex-1 cursor-pointer bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-1">
                  <SafeIcon icon={FiImage} size={16} />
                  <span className="text-sm">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">Max 5MB, JPG/PNG</p>
            </div>
          </div>
          
          {/* URL Input */}
          <div className="mt-3">
            <label className="flex items-center text-xs font-medium text-gray-600 mb-1">
              <SafeIcon icon={FiLink} className="mr-1 text-gray-400" size={12} />
              Or enter photo URL
            </label>
            <input
              type="url"
              value={formData.photo_url}
              onChange={handlePhotoUrlChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="https://example.com/photo.jpg"
            />
          </div>
        </div>
        
        {/* Camera View */}
        <AnimatePresence>
          {showCamera && (
            <motion.div
              initial={{opacity: 0, height: 0}}
              animate={{opacity: 1, height: 'auto'}}
              exit={{opacity: 0, height: 0}}
              className="relative bg-black rounded-lg overflow-hidden"
            >
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="w-full h-64 object-cover"
                style={{backgroundColor: '#000'}}
              />
              
              <div className="absolute inset-x-0 bottom-0 p-3 bg-black bg-opacity-50 flex justify-between items-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Take Photo
                </button>
              </div>
              
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                  <div className="text-white text-center p-4">
                    <p>{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCamera(false);
                        setCameraError('');
                      }}
                      className="mt-2 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter full name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sex
          </label>
          <select
            name="sex"
            value={formData.sex}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proximity
          </label>
          {/* FIXED: Use buttons with proper Title Case values */}
          <div className="flex items-center space-x-2">
            {VALID_PROXIMITIES.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setProximity(option)}
                className={`flex-1 py-3 px-3 rounded-md text-center transition-colors ${
                  formData.proximity === option
                    ? `border-2 ${getProximityColor(option)} border-${option.toLowerCase() === 'close' ? 'green' : option.toLowerCase() === 'medium' ? 'yellow' : 'blue'}-500`
                    : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-medium">{option}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="proximity" value={formData.proximity} />
          <p className="text-xs text-gray-500 mt-1">Current proximity: {formData.proximity}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nicknames
          </label>
          <input
            type="text"
            name="nicknames"
            value={formData.nicknames}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Separate with commas"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional information"
          />
        </div>
        
        <div className="flex space-x-3 pt-4" ref={bottomRef}>
          <button
            type="submit"
            disabled={isUploading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <SafeIcon icon={FiSave} />
            )}
            <span>{isUploading ? 'Saving...' : 'Save'}</span>
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
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

export default PersonForm