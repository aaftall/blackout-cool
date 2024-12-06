import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface CreateCommunityProps {
  onSuccess: (community: { id: string; name: string; start_date?: string | null; end_date?: string | null }) => void;
  onCancel: () => void;
}

export function CreateCommunity({ onSuccess, onCancel }: CreateCommunityProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
            start_date: startDate || null,
            end_date: endDate || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      onSuccess({
        id: data.id,
        name: data.name,
        start_date: data.start_date || null,
        end_date: data.end_date || null
      });
      toast.success('Party successfully created');
    } catch (error) {
      console.error('Failed to create the party:', error);
      toast.error('Failed to create the party');
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
      <div className="flex flex-col gap-2 w-full">
        <label className="text-white">Party starts</label>
        <DatePicker
          selected={startDate ? new Date(startDate) : null}
          onChange={(date) => {
            if (date) {
              const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00`;
              setStartDate(formattedDate);
            }
          }}
          showTimeSelect
          timeIntervals={60}
          timeFormat="HH:00"
          dateFormat="MMMM d, yyyy h:00 aa"
          className="w-full bg-camera-controls border-none text-white cursor-pointer p-2 rounded-md"
          disabled={isLoading}
          required
          calendarClassName="custom-datepicker"
          wrapperClassName="w-full"
        />
        <label className="text-white">Party ends</label>
        <DatePicker
          selected={endDate ? new Date(endDate) : null}
          onChange={(date) => {
            if (date) {
              const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00`;
              setEndDate(formattedDate);
            }
          }}
          showTimeSelect
          timeIntervals={60}
          timeFormat="HH:00"
          dateFormat="MMMM d, yyyy h:00 aa"
          className="w-full bg-camera-controls border-none text-white cursor-pointer p-2 rounded-md"
          disabled={isLoading}
          calendarClassName="custom-datepicker"
          wrapperClassName="w-full"
        />
      </div>
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