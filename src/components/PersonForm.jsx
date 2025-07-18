import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'

const { FiSave, FiX, FiCamera, FiTrash2, FiUser, FiImage, FiLink, FiRefreshCw, FiAlertCircle } = FiIcons

// Use safer import approach for react-webcam
const ReactWebcam = React.lazy(() => import('react-webcam').catch(() => ({ 
  default: () => null 
})));

const PersonForm = ({ person, onSubmit, onCancel }) => {
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
  const [isCameraSupported, setIsCameraSupported] = useState(false)
  const [formError, setFormError] = useState('')
  const [cameraDevices, setCameraDevices] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [facingMode, setFacingMode] = useState('user')
  const [isCapturing, setIsCapturing] = useState(false)
  const [videoStream, setVideoStream] = useState(null)
  const [webcamAvailable, setWebcamAvailable] = useState(false)
  const [permissionAsked, setPermissionAsked] = useState(false)
  const [isInIframe, setIsInIframe] = useState(false)
  
  const webcamRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const bottomRef = useRef(null)
  const formRef = useRef(null)
  const [historyHandled, setHistoryHandled] = useState(false)

  // Updated iframe detection with permission check
  useEffect(() => {
    const checkIframeAndPermissions = async () => {
      try {
        const isInIframeContext = window.self !== window.top;
        setIsInIframe(isInIframeContext);

        if (isInIframeContext) {
          // Check if we have camera permissions in the iframe
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'camera' });
            console.log('Camera permission status:', permissionStatus.state);
            
            // If permission is granted or prompted, we can use the camera
            if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
              setIsInIframe(false); // Allow camera usage
            }
          } catch (permError) {
            console.log('Permission check error:', permError);
            // Fall back to checking if we can access media devices
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop()); // Clean up
                setIsInIframe(false); // We can use the camera
              } catch (mediaError) {
                console.log('Media access error:', mediaError);
                // Keep isInIframe true as we can't access the camera
              }
            }
          }
        }
      } catch (e) {
        console.log('Iframe check error:', e);
        setIsInIframe(true); // Assume restricted environment if we can't check
      }
    };

    checkIframeAndPermissions();
  }, []);

  // Check if react-webcam is available
  useEffect(() => {
    const checkWebcamAvailability = async () => {
      try {
        const module = await import('react-webcam').catch(() => null);
        setWebcamAvailable(!!module);
        console.log('react-webcam availability:', !!module);
      } catch (error) {
        console.log('react-webcam not available:', error);
        setWebcamAvailable(false);
      }
    };
    
    checkWebcamAvailability();
  }, []);

  // Safer camera detection with better error handling
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.log('Media devices not supported by browser');
          setIsCameraSupported(false);
          return;
        }

        // Only check permission if we haven't already tried
        if (!permissionAsked) {
          try {
            setPermissionAsked(true);
            // Use lower resolution for permission test
            const constraints = {
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 }
              },
              audio: false
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Stop the test stream immediately
            stream.getTracks().forEach(track => track.stop());
            
            setIsCameraSupported(true);
            console.log('Camera permission granted');
          } catch (permError) {
            console.log('Camera permission denied:', permError);
            setIsCameraSupported(false);
            
            if (isInIframe && permError.name === 'NotReadableError') {
              setCameraError('Camera access is restricted in embedded views. Please use the file upload option instead.');
            } else if (permError.name === 'NotAllowedError') {
              setCameraError('Camera permission denied. Please check your browser settings.');
            } else {
              setCameraError(`Camera not available: ${permError.name}`);
            }
            return;
          }
        }

        // Get available devices only if permission granted
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          console.log('Available video devices:', videoDevices.length);
          
          if (videoDevices.length === 0) {
            setIsCameraSupported(false);
            setCameraError('No camera detected on this device.');
            return;
          }
          
          setCameraDevices(videoDevices);
          
          // Set default camera
          if (videoDevices.length > 0) {
            // Try to find a back camera first on mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
              const backCamera = videoDevices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('rear')
              );
              
              if (backCamera) {
                setSelectedCamera(backCamera.deviceId);
                setFacingMode('environment');
              } else {
                setSelectedCamera(videoDevices[0].deviceId);
              }
            } else {
              // On desktop, default to first camera
              setSelectedCamera(videoDevices[0].deviceId);
            }
          }
        } catch (enumError) {
          console.log('Error enumerating devices:', enumError);
          // Still allow camera usage even if we can't enumerate
          setIsCameraSupported(true);
        }
      } catch (err) {
        console.log('Camera support check error:', err);
        setIsCameraSupported(false);
        setCameraError('Camera not supported or permission denied.');
      }
    };
    
    checkCameraSupport();
  }, [permissionAsked, isInIframe]);

  // Cleanup video stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  // Scroll to bottom when form opens
  useEffect(() => {
    if (bottomRef.current) {
      setTimeout(() => {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  // Prevent back button from exiting app - OPTIMIZED
  useEffect(() => {
    if (historyHandled) return;

    const handleBackButton = () => {
      onCancel();
    };
    
    window.addEventListener('popstate', handleBackButton);
    
    // Only add history entry once
    if (!historyHandled) {
      window.history.pushState({ action: 'personForm' }, '');
      setHistoryHandled(true);
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onCancel, historyHandled]);

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

    try {
      setIsUploading(true)
      
      // Create a copy of the form data
      let finalFormData = { ...formData };
      
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
      
      // Note: We don't need to set isUploading to false here because
      // the component will unmount after successful submission
    } catch (error) {
      console.error('Error saving person:', error);
      setFormError(error.message || 'Failed to save person');
      setIsUploading(false); // Make sure to set isUploading to false on error
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    
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
    
    setFormData(prev => ({
      ...prev,
      proximity: titleCase
    }));
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
    setFormData(prev => ({
      ...prev,
      photo_url: url
    }))
    setPhotoPreview(url)
    setPhotoFile(null) // Clear file if URL is being used
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview('')
    setFormData(prev => ({
      ...prev,
      photo_url: ''
    }))
  }

  // Handle camera device selection
  const handleCameraChange = (e) => {
    const deviceId = e.target.value;
    setSelectedCamera(deviceId);
    
    // Try to determine if this is a front or back camera
    const device = cameraDevices.find(d => d.deviceId === deviceId);
    if (device) {
      if (device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear')) {
        setFacingMode('environment');
      } else {
        setFacingMode('user');
      }
    }
  };

  // Toggle camera facing mode (front/back)
  const toggleFacingMode = () => {
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
    
    // Find an appropriate camera for the new facing mode
    if (cameraDevices.length > 1) {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      const searchTerm = newMode === 'environment' ? 'back' : 'front';
      
      const matchingCamera = cameraDevices.find(device => 
        device.label.toLowerCase().includes(searchTerm)
      );
      
      if (matchingCamera) {
        setSelectedCamera(matchingCamera.deviceId);
      }
    }
  };

  // Start camera with improved error handling
  const startCamera = async () => {
    // Clear any previous errors
    setCameraError('');
    setIsCapturing(false);
    
    // If we're in an iframe, show warning and don't try to access camera
    if (isInIframe) {
      setCameraError('Camera access is restricted in embedded views. Please use the file upload option instead.');
      return;
    }
    
    try {
      // Stop any existing stream first
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
      
      // Default constraints with lower resolution for better compatibility
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode
        },
        audio: false
      };
      
      // Add deviceId constraint if we have a selected camera
      if (selectedCamera) {
        console.log('Using selected camera:', selectedCamera);
        constraints.video.deviceId = { exact: selectedCamera };
      }
      
      console.log('Camera constraints:', JSON.stringify(constraints));
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setVideoStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Ensure video is playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => {
            console.log('Error playing video:', e);
            setCameraError('Failed to start video stream');
          });
        };
      }
      
      setShowCamera(true);
      
    } catch (err) {
      console.error('Camera access error:', err);
      
      // More specific error messages
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please check your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setCameraError('Camera is already in use or not accessible in this context.');
      } else {
        setCameraError(`Failed to access camera: ${err.message}`);
      }
      
      setIsCameraSupported(false);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setShowCamera(false);
  };

  // Improved photo capture with better error handling
  const capturePhoto = () => {
    setIsCapturing(true);
    
    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Make sure video is actually playing and has dimensions
        if (!video.videoWidth || !video.videoHeight) {
          setCameraError('Video stream not ready. Please try again.');
          setIsCapturing(false);
          return;
        }
        
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob with error handling
        try {
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
              setPhotoFile(file);
              
              // Create preview URL
              const previewUrl = URL.createObjectURL(blob);
              setPhotoPreview(previewUrl);
              
              stopCamera();
            } else {
              setCameraError('Failed to capture photo. Please try again.');
            }
            setIsCapturing(false);
          }, 'image/jpeg', 0.8);
        } catch (blobError) {
          console.error('Blob creation error:', blobError);
          setCameraError('Failed to process captured image.');
          setIsCapturing(false);
        }
      } else {
        setCameraError('Camera not properly initialized.');
        setIsCapturing(false);
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
      setCameraError('Failed to capture photo: ' + err.message);
      setIsCapturing(false);
    }
  };

  const getProximityColor = (proximity) => {
    switch (proximity.toLowerCase()) {
      case 'close': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'far': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Webcam component with fallback and suspense
  const WebcamComponent = () => {
    if (webcamAvailable) {
      return (
        <React.Suspense fallback={<div className="w-full h-64 bg-gray-900 flex items-center justify-center text-white">Loading camera...</div>}>
          <ReactWebcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode,
              ...(selectedCamera ? { deviceId: selectedCamera } : {})
            }}
            className="w-full h-64 object-cover"
            style={{ backgroundColor: '#000' }}
            mirrored={facingMode === 'user'}
            onUserMediaError={(err) => {
              console.log('Webcam media error:', err);
              setCameraError(`Camera error: ${err.name}`);
            }}
          />
        </React.Suspense>
      );
    }

    // Native video element fallback
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-64 object-cover"
        style={{ 
          backgroundColor: '#000',
          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
        }}
        onError={(e) => {
          console.error('Video element error:', e);
          setCameraError('Video stream error');
        }}
      />
    );
  };

  // Capture function for both Webcam and native video
  const handleCapture = () => {
    setIsCapturing(true);
    
    if (webcamAvailable && webcamRef.current) {
      try {
        // Use react-webcam method
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          fetch(imageSrc)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
              setPhotoFile(file);
              setPhotoPreview(imageSrc);
              stopCamera();
              setIsCapturing(false);
            })
            .catch(err => {
              console.error('Error processing webcam image:', err);
              setCameraError('Failed to process image');
              setIsCapturing(false);
            });
        } else {
          setCameraError('Failed to capture webcam image');
          setIsCapturing(false);
        }
      } catch (err) {
        console.error('Webcam capture error:', err);
        setCameraError('Failed to capture image');
        setIsCapturing(false);
      }
    } else {
      // Use native capture method
      capturePhoto();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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

      {isInIframe && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <SafeIcon icon={FiAlertCircle} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-yellow-800">
              <h4 className="font-medium mb-1">Camera Access Restricted</h4>
              <p className="text-sm mb-2">
                Camera access appears to be restricted because this app is running in an embedded view (iframe).
              </p>
              <div className="bg-white bg-opacity-50 p-3 rounded text-sm font-mono text-yellow-700 mb-2">
                {'<iframe'}
                <br />
                {'  src="' + window.location.origin + '"'}
                <br />
                {'  allow="camera; microphone"'}
                <br />
                {'  allowfullscreen'}
                <br />
                {'  style="width: 100%; height: 100%; border: none;"'}
                <br />
                {'/>'} 
              </div>
              <p className="text-sm">
                The embedding page must include these iframe attributes to enable camera access.
                Until then, please use the file upload option instead.
              </p>
            </div>
          </div>
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
                    onError={() => {
                      setPhotoPreview('');
                      setFormData(prev => ({
                        ...prev,
                        photo_url: ''
                      }));
                    }}
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
                {/* Camera Button - Only show if not in iframe */}
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isInIframe}
                  className={`flex-1 ${isInIframe ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-2 rounded-md transition-colors flex items-center justify-center space-x-1`}
                >
                  <SafeIcon icon={FiCamera} size={16} />
                  <span className="text-sm">Camera</span>
                </button>

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
              value={formData.photo_url || ''}
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
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative bg-black rounded-lg overflow-hidden"
            >
              {cameraDevices.length > 1 && (
                <div className="absolute top-2 right-2 z-10">
                  <button 
                    type="button"
                    onClick={toggleFacingMode}
                    className="p-2 bg-black bg-opacity-50 rounded-full text-white"
                    title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
                  >
                    <SafeIcon icon={FiRefreshCw} size={20} />
                  </button>
                </div>
              )}
              
              <WebcamComponent />

              {cameraDevices.length > 1 && (
                <div className="absolute top-2 left-2 z-10 max-w-[60%]">
                  <select 
                    value={selectedCamera} 
                    onChange={handleCameraChange}
                    className="text-xs bg-black bg-opacity-50 text-white border border-gray-700 rounded px-2 py-1"
                  >
                    {cameraDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${cameraDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  onClick={handleCapture}
                  disabled={isCapturing}
                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center space-x-1"
                >
                  {isCapturing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Capturing...</span>
                    </>
                  ) : (
                    <span>Take Photo</span>
                  )}
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

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

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