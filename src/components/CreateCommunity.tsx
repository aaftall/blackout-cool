import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface CreateCommunityProps {
  onSuccess: (community: { id: string; name: string }) => void;
  onCancel: () => void;
}

export function CreateCommunity({ onSuccess, onCancel }: CreateCommunityProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('communities')
        .insert([
          {
            name: name.trim(),
            created_by: user.id,
            start_date: startDate.toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      onSuccess({ id: data.id, name: data.name });
      toast.success('Community created successfully');
    } catch (error) {
      console.error('Failed to create community:', error);
      toast.error('Failed to create community');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Community name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-camera-controls border-none text-white placeholder-gray-400"
        disabled={isLoading}
        required
      />
      <Input
        type="datetime-local"
        value={startDate.toISOString().slice(0, 16)}
        onChange={(e) => setStartDate(new Date(e.target.value))}
        className="bg-camera-controls border-none text-white"
        disabled={isLoading}
        required
      />
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-camera-controls hover:bg-opacity-80"
          disabled={isLoading}
        >
          Create
        </Button>
      </div>
    </form>
  );
} 