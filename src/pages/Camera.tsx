import React, { useRef, useState, useCallback } from 'react';
import { Camera as CameraIcon, CameraRotate, Zap, ZapOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const navigate = useNavigate();
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
        },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Unable to access camera');
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isFrontCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    
    // Here you would normally upload the image
    // For now we'll just show a success message
    toast.success('Photo captured! It will be available tomorrow at noon.');
  }, []);

  const toggleCamera = () => {
    setIsFrontCamera(prev => !prev);
  };

  return (
    <div className="fixed inset-0 bg-camera-background flex flex-col">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline
        className="h-full w-full object-cover"
      />
      
      <div className="absolute bottom-0 inset-x-0 p-6 flex justify-between items-center">
        <button
          onClick={() => setIsFlashOn(prev => !prev)}
          className="p-4 rounded-full bg-camera-controls backdrop-blur-lg"
        >
          {isFlashOn ? (
            <Zap className="w-6 h-6 text-yellow-400" />
          ) : (
            <ZapOff className="w-6 h-6 text-white" />
          )}
        </button>

        <button
          onClick={capturePhoto}
          className="w-20 h-20 rounded-full bg-camera-button flex items-center justify-center
                   transform active:scale-95 transition-transform"
        >
          <CameraIcon className="w-8 h-8 text-white" />
        </button>

        <button
          onClick={toggleCamera}
          className="p-4 rounded-full bg-camera-controls backdrop-blur-lg"
        >
          <CameraRotate className="w-6 h-6 text-white" />
        </button>
      </div>

      <button
        onClick={() => navigate('/gallery')}
        className="absolute top-6 right-6 p-4 rounded-full bg-camera-controls backdrop-blur-lg"
      >
        <div className="w-6 h-6 rounded bg-white" />
      </button>
    </div>
  );
};

export default Camera;