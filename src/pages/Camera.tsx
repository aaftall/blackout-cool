import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, SwitchCamera, Zap, ZapOff, Menu, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button"

type CommunityMember = {
  community: {
    id: string;
    name: string;
    created_by: string;
    start_date: string | null;
  }
}

const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [canCapture, setCanCapture] = useState<boolean>(true);
  const [activeCommunity, setActiveCommunity] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkActiveCommunities = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      
      const { data: communities, error } = await supabase
        .from('community_members')
        .select(`
          community:communities (
            id,
            name,
            created_by,
            start_date,
            end_date
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching communities:', error);
        return;
      }

      // Filter communities that haven't ended yet
      const activeCommunities = communities
        ?.filter(({ community }) => {
          if (!community?.end_date) return false;
          const endDate = new Date(community.end_date);
          return now <= endDate;
        })
        .map(({ community }) => ({
          ...community,
          endDate: new Date(community.end_date!)
        }));

      // Find community with closest end date
      const closestCommunity = activeCommunities?.sort((a, b) => 
        a.endDate.getTime() - b.endDate.getTime()
      )[0];

      if (closestCommunity) {
        setActiveCommunity(closestCommunity.id);
        toast.success(`Photos will be added to ${closestCommunity.name}`);
      } else {
        setActiveCommunity(null);
        toast.error('No active BO found. Join or create one to start capturing photos.');
      }
    };

    checkActiveCommunities();
  }, []);

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

  const startCooldown = useCallback(() => {
    setCanCapture(false);
    setTimeRemaining(10);
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanCapture(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canCapture) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in');
        return;
      }

      if (!activeCommunity) {
        toast.error('No active Blackout found. Create a new one to start capturing photos.');
        return;
      }

      // Check if community is still active
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('end_date, name')
        .eq('id', activeCommunity)
        .single();

      if (communityError) throw communityError;

      const now = new Date();
      const endDate = community.end_date ? new Date(community.end_date) : null;

      if (!endDate || now > endDate) {
        toast.error(`Cannot add photos to ${community.name} - event has ended`);
        setActiveCommunity(null);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(videoRef.current, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.8);
      });

      const fileName = `${uuidv4()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('photos')
        .insert([
          {
            user_id: user.id,
            photo_url: publicUrl,
            community_id: activeCommunity || undefined
          }
        ]);

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error(`Failed to save photo reference: ${dbError.message}`);
        return;
      }

      toast.success(activeCommunity 
        ? 'Photo captured and saved to community' 
        : 'Photo captured and saved');
      startCooldown();
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to capture photo');
    }
  }, [canCapture, startCooldown, activeCommunity]);

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

        <div className="relative">
          <button
            onClick={capturePhoto}
            disabled={!canCapture}
            className={`w-20 h-20 rounded-full flex items-center justify-center
                     transform active:scale-95 transition-transform
                     ${canCapture ? 'bg-camera-button' : 'bg-gray-500'}`}
          >
            <CameraIcon className="w-8 h-8 text-white" />
          </button>
          {!canCapture && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/75 
                          text-white px-2 py-1 rounded-full text-sm">
              {timeRemaining}s
            </div>
          )}
        </div>

        <button
          onClick={toggleCamera}
          className="p-4 rounded-full bg-camera-controls backdrop-blur-lg"
        >
          <SwitchCamera className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="absolute top-6 right-6 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/user')}
          className="p-3 rounded-full bg-camera-controls backdrop-blur-lg"
        >
          <User className="w-6 h-6 text-white font-bold" />
        </Button>
      </div>
    </div>
  );
};

export default Camera;