import { supabase } from '@/integrations/supabase/client';

interface Profile {
  username?: string | null;
  avatar_url?: string | null;
}

export const profileApi = {
  async getProfile(): Promise<Profile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    let { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();

    // If no profile exists, create one
    if (error && error.message.includes('no rows')) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            username: '',
            avatar_url: null
          }
        ]);

      if (insertError) throw insertError;

      // Fetch the newly created profile
      const { data: newProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      data = newProfile;
    } else if (error) {
      throw error;
    }

    return data || {};
  },

  async updateProfile(data: Partial<Profile>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...data })
      .eq('id', user.id);

    if (error) throw error;
  },

  async uploadAvatar(file: File): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (e.g., 2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;

      // First, remove old avatar if exists
      const { data: oldAvatar } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (oldAvatar?.avatar_url) {
        const oldFileName = oldAvatar.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([oldFileName]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await this.updateProfile({ avatar_url: publicUrl });
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    }
  }
}; 