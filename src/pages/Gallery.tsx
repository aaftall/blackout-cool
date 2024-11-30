import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Gallery = () => {
  const navigate = useNavigate();
  const [timeUntilReveal, setTimeUntilReveal] = React.useState('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const noon = new Date(now);
      noon.setHours(12, 0, 0, 0);
      
      if (now.getHours() >= 12) {
        noon.setDate(noon.getDate() + 1);
      }
      
      const diff = noon.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilReveal(`${hours}h ${minutes}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <button
          onClick={() => navigate('/')}
          className="p-3 rounded-full bg-camera-controls"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center justify-center space-x-2 mb-8 p-4 rounded-lg bg-camera-controls">
        <Clock className="w-5 h-5" />
        <span>Next reveal in {timeUntilReveal}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* This would normally be populated with yesterday's photos */}
        <div className="aspect-square bg-camera-controls rounded-lg flex items-center justify-center">
          <span className="text-sm text-gray-400">No photos yet</span>
        </div>
        <div className="aspect-square bg-camera-controls rounded-lg flex items-center justify-center">
          <span className="text-sm text-gray-400">No photos yet</span>
        </div>
      </div>
    </div>
  );
};

export default Gallery;