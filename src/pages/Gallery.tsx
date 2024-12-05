import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Clock, Menu, User } from 'lucide-react';
import { format, addDays, setHours, setMinutes, isBefore, isAfter } from 'date-fns';
import { Button } from "@/components/ui/button"
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type photos = {
  id: string;
  photo_url: string;
  created_at: string;
  community_id: string;
};

type communities = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  start_date: string | null;
};

interface GalleryProps {
  communityId?: string;
}

const Gallery = ({ communityId }: GalleryProps) => {
  const [photos, setPhotos] = useState<photos[]>([]);
  const [community, setCommunity] = useState<communities | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!communityId) {
        toast.error('No community ID provided');
        return;
      }

      setLoading(true);
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .eq('community_id', communityId);

        if (photosError) throw photosError;

        console.log('Raw photos data:', photosData);

        // Transform the photos data to include proper public URLs
        const photosWithUrls = photosData?.map(photo => {
          // Check if the URL is already a full Supabase URL
          if (photo.photo_url.startsWith('http')) {
            return photo;
          }

          // Only get public URL if it's not already a full URL
          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(photo.photo_url);

          return {
            ...photo,
            photo_url: publicUrlData.publicUrl
          };
        }) || [];

        setPhotos(photosWithUrls);
      } catch (error) {
        console.error('Error fetching photos:', error);
        toast.error('Failed to load photos');
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [communityId, navigate]);

  useEffect(() => {
    if (!communityId) return;

    const subscription = supabase
      .channel('photos_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
          filter: `community_id=eq.${communityId}`
        },
        (payload) => {
          setPhotos(current => [...current, payload.new as photos]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [communityId]);

  useEffect(() => {
    const fetchCommunity = async () => {
      if (!communityId) {
        toast.error('No community ID provided');
        return;
      }

      try {
        const { data: communityData, error: communityError } = await supabase
          .from('communities')
          .select('*')
          .eq('id', communityId)
          .single();

        if (communityError) throw communityError;

        setCommunity(communityData);
      } catch (error) {
        console.error('Error fetching community:', error);
        toast.error('Failed to load community');
      }
    };

    fetchCommunity();
  }, [communityId]);

  const addPhotoToCommunity = useCallback(async (photoUrl: string) => {
    if (!communityId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('photos')
        .insert({
          photo_url: photoUrl,
          community_id: communityId,
          user_id: user.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding photo:', error);
      toast.error('Failed to add photo to community');
    }
  }, [communityId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <p>Community not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">
          {community?.name || 'Gallery'}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="p-3 rounded-full bg-camera-controls"
          >
            <Camera className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/user')}
            className="p-3 rounded-full bg-camera-controls"
          >
            <User className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="aspect-square relative overflow-hidden">
            <img 
              src={photo.photo_url} 
              alt="" 
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
              onError={(e) => {
                console.error('Image failed to load:', photo.photo_url);
                if (e.currentTarget.src !== 'fallback-image-url') {
                  e.currentTarget.src = 'fallback-image-url';
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const PhotosNotAvailable = ({ displayTime }: { displayTime: Date }) => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
    <h2 className="text-xl font-semibold mb-2">Photos Not Available Yet</h2>
    <p className="text-gray-400">
      Photos will be visible on {displayTime.toLocaleDateString()} at{' '}
      {displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </p>
  </div>
);

export default Gallery;