import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Download, Send, X, RefreshCw, Smile, Type, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useCollageStore } from '../store/collageStore';
import Layout from '../components/layout/Layout';

type VideoDevice = {
  deviceId: string;
  label: string;
};

const PhotoboothPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [text, setText] = useState<{value: string; x: number; y: number; size: number; previewSize?: number}>({
    value: '',
    x: 50,
    y: 50,
    size: 48 // Base size for the actual photo
  });
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickers, setStickers] = useState<{id: string; url: string; category: string}[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<{url: string; x: number; y: number; size: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState(0);
  const [initialDistance, setInitialDistance] = useState(0);
  const { currentCollage, fetchCollageByCode, uploadPhoto } = useCollageStore();
  const textOverlayRef = useRef<HTMLDivElement>(null);
  const stickerOverlayRef = useRef<HTMLDivElement>(null);

  // Fetch stickers from database
  useEffect(() => {
    const fetchStickers = async () => {
      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching stickers:', error);
        return;
      }
      
      setStickers(data);
    };
    
    fetchStickers();
  }, []);

  const startCamera = async (deviceId?: string) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
    }

    setLoading(true);
    setError(null);

    // Add delay to ensure previous stream is fully cleaned up
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // First check if we have permission
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (permissions.state === 'denied') {
        throw new Error('Camera access is blocked. Please allow camera access in your browser settings and refresh the page.');
      }
      
      // Get list of video devices
      const allDevices = await navigator.mediaDevices.enumerateDevices()
        .catch(() => []);
      
      const videoDevices = allDevices
        .filter(device => device.kind === 'videoinput')
        .map(device => {
          return {
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId}`
          };
        });
      
      setDevices(videoDevices);
      
      if (videoDevices.length === 0) {
        throw new Error('No cameras detected. Please check your camera connection and refresh the page.');
      }

      let targetDeviceId = deviceId;
      if (!targetDeviceId || !videoDevices.find(d => d.deviceId === targetDeviceId)) {
        targetDeviceId = videoDevices[0].deviceId;
      }

      // Try to release any existing tracks
      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      const constraints = {
        video: {
          deviceId: { exact: targetDeviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user",
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      let mediaStream: MediaStream;
      try {
        mediaStream = await Promise.race([
          navigator.mediaDevices.getUserMedia(constraints),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Camera access timed out')), 10000)
          )
        ]);
      } catch (err) {
        // Try again with default constraints if specific device failed
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await Promise.race([
            new Promise<void>((resolve, reject) => {
              if (!videoRef.current) return reject();
              videoRef.current.onloadedmetadata = () => resolve();
              videoRef.current.onerror = () => reject(new Error('Failed to initialize video'));
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Video initialization timed out')), 5000)
            )
          ]);
          
          await videoRef.current.play();
        } catch (err) {
          throw new Error('Failed to initialize video stream. Please refresh and try again.');
        }
      }

      setStream(mediaStream as MediaStream);
      setSelectedDevice(targetDeviceId);
      setError(null);
    } catch (err: any) {
      let errorMessage = 'Failed to access camera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera access in your browser settings and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application or timed out. Please:\n' +
          '1. Close other apps using your camera\n' +
          '2. Refresh the page\n' +
          '3. Try selecting a different camera if available';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Could not find a camera matching the requested settings. Please try a different camera.';
      } else if (err.message.includes('timed out')) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.warn('Camera access warning:', err);
      
      // Clean up any partial streams
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setStream(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) {
      fetchCollageByCode(code);
    }
  }, [code, fetchCollageByCode]);

  useEffect(() => {
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setStream(null);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedDevice && !stream) {
      startCamera(selectedDevice);
    } else if (devices.length > 0) {
      setSelectedDevice(devices[0].deviceId);
    }
  }, [selectedDevice, devices.length, stream]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const containerWidth = video.clientWidth;

      if (context) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        // Calculate preview text size based on container width ratio
        const previewScale = containerWidth / width;
        const previewTextSize = text.size * previewScale;
        
        // Store preview size for the text overlay
        setText(prev => ({ ...prev, previewSize: previewTextSize }));
        
        canvas.width = width;
        canvas.height = height;

        // Draw video frame
        context.drawImage(video, 0, 0, width, height);

        // Add text if present
        if (text.value) {
          context.font = `bold ${text.size}px -apple-system, system-ui`;
          context.fillStyle = 'white';
          context.strokeStyle = 'black';
          context.lineWidth = 2;
          context.textAlign = 'center';
          context.textBaseline = 'bottom';
          
          // Use the relative position from the text overlay
          const x = width * (text.x / 100);
          const y = height * (text.y / 100);
          
          // Draw text stroke first
          context.strokeText(text.value, x, y);
          // Then fill
          context.fillText(text.value, x, y);
        }

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setPhoto(dataUrl);
      }
    }
  };

  const handleTextDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleTextDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !textOverlayRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const container = textOverlayRef.current.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    setText(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, prev.x + (deltaX / rect.width) * 100)),
      y: Math.max(0, Math.min(100, prev.y + (deltaY / rect.height) * 100))
    }));

    setDragStart({ x: clientX, y: clientY });
  };

  const handleTextDragEnd = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, corner: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeCorner(corner);
    setInitialSize(text.size);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleResize = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizing || !textOverlayRef.current) return;
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    const delta = Math.max(deltaX, deltaY);

    const newSize = Math.max(24, Math.min(240, initialSize + delta * 0.5));
    setText(prev => ({
      ...prev,
      size: newSize,
      previewSize: newSize * (videoRef.current?.clientWidth || 1) / (videoRef.current?.videoWidth || 1)
    }));
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeCorner(null);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setInitialDistance(distance);
      setInitialSize(text.size);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = distance / initialDistance;
      const newSize = Math.max(24, Math.min(240, initialSize * scale));
      setText(prev => ({
        ...prev,
        size: newSize,
        previewSize: newSize * (videoRef.current?.clientWidth || 1) / (videoRef.current?.videoWidth || 1)
      }));
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText(prev => ({
      ...prev,
      value: prev.value + emojiData.emoji,
      size: Math.max(prev.size, 96) // Ensure emoji is large enough to be visible
    }));
    setShowEmojiPicker(false);
  };

  const handleStickerClick = (sticker: {url: string}) => {
    setSelectedSticker({
      url: sticker.url,
      x: 50,
      y: 50,
      size: 100 // Default sticker size
    });
    setShowStickerPicker(false);
  };

  const handleStickerDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!selectedSticker) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleStickerWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedSticker) return;
    
    const delta = e.deltaY * -0.5;
    setSelectedSticker(prev => ({
      ...prev!,
      size: Math.max(40, Math.min(300, prev!.size + delta))
    }));
  };

  const handleStickerDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !stickerOverlayRef.current || !selectedSticker) return;
    e.stopPropagation();
    e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const container = stickerOverlayRef.current.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    setSelectedSticker(prev => ({
      ...prev!,
      x: Math.max(0, Math.min(100, prev!.x + (deltaX / rect.width) * 100)),
      y: Math.max(0, Math.min(100, prev!.y + (deltaY / rect.height) * 100))
    }));

    setDragStart({ x: clientX, y: clientY });
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeCorner(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  const uploadToCollage = async () => {
    if (!photo || !currentCollage) return;

    // Create a temporary canvas to combine photo and text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      setError('Failed to create canvas context');
      return;
    }
    
    // Load the photo into an image element
    const img = new Image();
    img.src = photo;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    // Set canvas dimensions to match the photo
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    
    // Draw the photo
    tempCtx.drawImage(img, 0, 0);
    
    // Draw sticker if present
    if (selectedSticker) {
      const stickerImg = new Image();
      stickerImg.src = selectedSticker.url;
      await new Promise((resolve, reject) => {
        stickerImg.onload = resolve;
        stickerImg.onerror = reject;
      });
      
      const x = tempCanvas.width * (selectedSticker.x / 100);
      const y = tempCanvas.height * (selectedSticker.y / 100);
      const size = selectedSticker.size * (tempCanvas.width / img.width);
      
      tempCtx.drawImage(
        stickerImg,
        x - size/2,
        y - size/2,
        size,
        size
      );
    }
    
    // Add text if present
    if (text.value) {
      // Use the actual size for the final image
      tempCtx.font = `bold ${text.size}px -apple-system, system-ui`;
      tempCtx.fillStyle = 'white';
      tempCtx.strokeStyle = 'black';
      tempCtx.lineWidth = 2;
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'bottom';
      
      // Calculate actual pixel positions from percentages
      const x = tempCanvas.width * (text.x / 100);
      const y = tempCanvas.height * (text.y / 100);
      
      // Draw text stroke first
      tempCtx.strokeText(text.value, x, y);
      // Then fill
      tempCtx.fillText(text.value, x, y);
    }
    
    // Get the final image with text
    const finalImageUrl = tempCanvas.toDataURL('image/jpeg', 0.95);

    setUploading(true);
    setError(null);

    try {
      // Convert data URL to Blob
      const response = await fetch(finalImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      // Upload photo
      const result = await uploadPhoto(currentCollage.id, file);
      if (result) {
        // Reset state and return to photobooth
        retakePhoto();
      } else {
        throw new Error('Failed to upload photo');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setUploading(false);
    }
  };

  const downloadPhoto = () => {
    if (!photo || !text) return;
    
    // Create a temporary canvas to combine photo and text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      setError('Failed to create canvas context');
      return;
    }
    
    // Load the photo into an image element
    const img = new Image();
    img.src = photo;
    
    img.onload = () => {
      // Set canvas dimensions to match the photo
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      
      // Draw the photo
      tempCtx.drawImage(img, 0, 0);
      
      // Add text if present
      if (text.value) {
        tempCtx.font = `bold ${text.size}px -apple-system, system-ui`;
        tempCtx.fillStyle = 'white';
        tempCtx.strokeStyle = 'black';
        tempCtx.lineWidth = 2;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'bottom';
        
        // Calculate actual pixel positions from percentages
        const x = tempCanvas.width * (text.x / 100);
        const y = tempCanvas.height * (text.y / 100);
        
        // Draw text stroke first
        tempCtx.strokeText(text.value, x, y);
        // Then fill
        tempCtx.fillText(text.value, x, y);
      }
      
      // Download the final image
      const link = document.createElement('a');
      link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
      link.download = 'photobooth.jpg';
      link.click();
    };

  };

  const retakePhoto = () => {
    setPhoto(null);
    setText({ value: '', x: 50, y: 50, size: 48 });
  };

  if (!currentCollage) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2 text-gray-400">Loading collage...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            {currentCollage.name}
          </h1>
          <p className="text-gray-400">
            Take a photo to add to the collage
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-200 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Camera device selector */}
        {devices.length > 1 && (
          <div className="mb-4">
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-black rounded-lg overflow-hidden aspect-[9/16] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div> 
          ) : !photo ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <img
                ref={photoRef}
                src={photo}
                alt="Preview" 
                className="w-full h-full object-cover"
              />
              {/* Editor Icons */}
              <div className="absolute top-4 left-4 flex space-x-2">
                <button
                  onClick={() => setShowTextEditor(!showTextEditor)}
                  className={`p-2 ${showTextEditor ? 'bg-purple-600' : 'bg-black/50 hover:bg-black/70'} rounded-full transition-colors`}
                >
                  <Type className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setShowStickerPicker(!showStickerPicker)}
                  className={`p-2 ${showStickerPicker ? 'bg-purple-600' : 'bg-black/50 hover:bg-black/70'} rounded-full transition-colors`}
                >
                  <Image className="h-6 w-6" />
                </button>
                {showTextEditor && (
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 ${showEmojiPicker ? 'bg-purple-600' : 'bg-black/50 hover:bg-black/70'} rounded-full transition-colors`}
                  >
                    <Smile className="h-6 w-6" />
                  </button>
                )}
              </div>
              {/* Sticker Picker */}
              {showStickerPicker && (
                <div className="absolute top-20 left-4 z-50 bg-black/90 rounded-lg p-4 backdrop-blur-lg border border-white/20">
                  <h3 className="text-white font-medium mb-2">Stickers</h3>
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                    {stickers.map((sticker) => (
                      <button
                        key={sticker.id}
                        onClick={() => handleStickerClick(sticker)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        <img
                          src={sticker.url}
                          alt={sticker.category}
                          className="w-12 h-12 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute top-20 left-4 z-50">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    theme="dark"
                  />
                </div>
              )}
              {/* Text Overlay */}
              {showTextEditor && (
                <div
                  ref={textOverlayRef}
                  className="absolute cursor-move select-none group"
                  style={{
                    left: `${text.x}%`,
                    top: `${text.y}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${text.previewSize || text.size}px`,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontFamily: '-apple-system, system-ui',
                    WebkitTextStroke: '1px black',
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '80%',
                    wordBreak: 'break-word'
                  }}
                  onMouseDown={handleTextDragStart}
                  onMouseMove={handleTextDrag}
                  onMouseUp={handleTextDragEnd}
                  onTouchStart={(e) => {
                    if (e.touches.length === 2) {
                      handleTouchStart(e.nativeEvent);
                    } else {
                      handleTextDragStart(e);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (e.touches.length === 2) {
                      handleTouchMove(e.nativeEvent);
                    } else {
                      handleTextDrag(e);
                    }
                  }}
                  onTouchEnd={handleTextDragEnd}
                  onWheel={(e: React.WheelEvent) => {
                    e.preventDefault();
                    if (!textOverlayRef.current) return;
                    
                    // Adjust size based on wheel direction
                    const delta = e.deltaY * -0.1; // Invert and reduce sensitivity
                    const newSize = Math.max(24, Math.min(240, text.size + delta));
                    
                    setText(prev => ({
                      ...prev,
                      size: newSize,
                      previewSize: newSize * (videoRef.current?.clientWidth || 1) / (videoRef.current?.videoWidth || 1)
                    }));
                  }}
                >
                  {/* Resize Handles */}
                  <div className="absolute -right-4 -bottom-4 w-8 h-8 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                       onMouseDown={(e) => handleResizeStart(e, 'se')}
                       onTouchStart={(e) => handleResizeStart(e, 'se')}
                       onMouseMove={handleResize}
                       onTouchMove={handleResize}
                       onMouseUp={handleResizeEnd}
                       onTouchEnd={handleResizeEnd}>
                    <div className="absolute right-0 bottom-0 w-3 h-3 border-r-2 border-b-2 border-white rounded-br-sm"></div>
                  </div>
                  {text.value || 'Click to add text'}
                </div>
              )}
              {/* Sticker Overlay */}
              {selectedSticker && (
                <div
                  ref={stickerOverlayRef}
                  className="absolute cursor-move select-none"
                  style={{
                    left: `${selectedSticker.x}%`,
                    top: `${selectedSticker.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${selectedSticker.size}px`,
                    height: `${selectedSticker.size}px`
                  }}
                  onMouseDown={handleStickerDragStart}
                  onMouseMove={handleStickerDrag}
                  onMouseUp={handleTextDragEnd}
                  onTouchStart={handleStickerDragStart}
                  onTouchMove={handleStickerDrag}
                  onTouchEnd={handleTextDragEnd}
                  onWheel={handleStickerWheel}
                >
                  <img
                    src={selectedSticker.url}
                    alt="Sticker"
                    className="w-full h-full object-contain"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  {/* Delete button */}
                  <button
                    onClick={() => setSelectedSticker(null)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* Text Input */}
              {showTextEditor && (
                <div className="absolute bottom-20 left-0 right-0 px-4">
                  <input
                    type="text"
                    value={text.value}
                    onChange={(e) => setText(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Type your text here..."
                    className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded text-white placeholder-gray-400"
                    autoFocus
                  />
                </div>
              )}
            </>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex flex-col space-y-4">
              <div className="flex space-x-2">
                {devices.length > 0 && (
                  <>
                    <button
                      onClick={() => startCamera(selectedDevice)}
                      className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      title="Refresh camera"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </>
                )}
                {photo && (
                  <div className="flex-1 flex space-x-2">
                    <button
                      onClick={retakePhoto}
                      className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Retake
                    </button>
                    <button
                      onClick={uploadToCollage}
                      disabled={uploading}
                      className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Submit Photo
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              {!photo && (
                <button
                  onClick={takePhoto}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take Photo
                </button>
              )}
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Layout>
  );
};

export default PhotoboothPage;