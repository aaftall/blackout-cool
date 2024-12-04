import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, Users, Link as LinkIcon, PlusCircle, Menu, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { profileApi } from '@/lib/api/profile';
import { supabase } from '@/lib/supabase';
import { CreateCommunity } from '@/components/CreateCommunity';

interface Community {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  start_date?: string;
}

const User = () => {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('');
  const [groups, setGroups] = React.useState<{ id: string; name: string; start_date?: string; created_at: string }[]>([]);
  const [showCreateCommunity, setShowCreateCommunity] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = React.useState('');
  const [editingGroupDate, setEditingGroupDate] = React.useState('');
  
  React.useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('Current user ID:', user?.id);
        if (userError) {
          console.error('User auth error:', userError);
          toast.error('Authentication error');
          navigate('/login');
          return;
        }

        if (!user) {
          toast.error('Please log in');
          navigate('/login');
          return;
        }

        const profile = await profileApi.getProfile();
        if (profile) {
          setUsername(profile.username || '');
          setAvatarUrl(profile.avatar_url);
        } else {
          console.error('Profile not found');
          toast.error('Profile not found');
        }

        const { data: userCommunities, error: memberError } = await supabase
          .from('community_members')
          .select(`
            community:communities (
              id,
              name,
              created_at,
              start_date,
              created_by
            )
          `)
          .eq('user_id', user.id);

        console.log('User Communities:', userCommunities);
        console.log('Member Error:', memberError);

        if (memberError) {
          console.error('Communities fetch error:', memberError);
          toast.error('Failed to load communities');
        } else {
          const communities = userCommunities
            ?.map(item => item.community)
            .filter(community => community !== null);
          setGroups(communities || []);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      }
    }
    loadProfile();
  }, [navigate]);

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      try {
        const url = await profileApi.uploadAvatar(file);
        setAvatarUrl(url);
        toast.success('Profile picture updated');
      } catch (error) {
        if (error instanceof Error) {
          switch (error.message) {
            case 'File size must be less than 2MB':
              toast.error('Image is too large. Please choose an image under 2MB.');
              break;
            case 'File must be an image':
              toast.error('Please select a valid image file.');
              break;
            case 'No user found':
              toast.error('Please log in again.');
              break;
            default:
              toast.error('Failed to upload profile picture. Please try again.');
          }
        } else {
          toast.error('Failed to upload profile picture. Please try again.');
        }
        console.error('Upload error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUsernameUpdate = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    try {
      await profileApi.updateProfile({ username: username.trim() });
      setIsEditingUsername(false);
      toast.success('Username updated');
    } catch (error) {
      console.error('Username update error:', error);
      toast.error('Failed to update username');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareLink = (groupId: string) => {
    // Get the current domain dynamically
    const domain = window.location.origin;
    const inviteLink = `${domain}/join/${groupId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        toast.success(`Invite link copied: ${inviteLink}`);
      })
      .catch(() => {
        // Fallback for browsers that don't support clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = inviteLink;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          toast.success(`Invite link copied: ${inviteLink}`);
        } catch (err) {
          toast.error('Failed to copy link');
        }
        document.body.removeChild(textarea);
      });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login'); // or wherever you want to redirect after logout
      toast.success('Successfully signed out');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', groupId);
      
      if (error) throw error;
      
      setGroups(groups.filter(group => group.id !== groupId));
      toast.success('Community deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete community');
    }
  };

  const handleUpdateGroup = async (groupId: string) => {
    try {
      // Format the date properly for the database
      const formattedDate = editingGroupDate ? new Date(editingGroupDate).toISOString() : null;

      const { error } = await supabase
        .from('communities')
        .update({ 
          name: editingGroupName,
          start_date: formattedDate  // Use the formatted date
        })
        .eq('id', groupId);
      
      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      setGroups(groups.map(group => 
        group.id === groupId ? { 
          ...group, 
          name: editingGroupName,
          start_date: formattedDate || undefined  // Convert null to undefined
        } : group
      ));
      setEditingGroupId(null);
      toast.success('Community updated');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update community');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col justify-between">
      {/* Header with navigation */}
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Profile</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="p-3 rounded-full bg-camera-controls"
            >
              <Camera className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>
                  <Image className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <label 
                className="absolute bottom-0 right-0 p-2 bg-camera-controls rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                htmlFor="profile-picture"
              >
                <Image className="w-4 h-4 text-white" />
              </label>
              <input
                type="file"
                id="profile-picture"
                className="hidden"
                accept="image/*"
                onChange={handleProfilePictureUpload}
              />
            </div>
            <div className="flex items-center gap-2 max-w-xs w-full">
              {isEditingUsername ? (
                <Input
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={handleUsernameUpdate}
                  onKeyDown={(e) => e.key === 'Enter' && handleUsernameUpdate()}
                  disabled={isLoading}
                  autoFocus
                  className="bg-camera-controls border-none text-white placeholder-gray-400"
                />
              ) : (
                <div className="flex items-center justify-between w-full">
                  <Input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setIsEditingUsername(true)}
                    disabled={isLoading}
                    className="bg-camera-controls border-none text-white placeholder-gray-400"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingUsername(true)}
                    className="hover:bg-opacity-80"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Groups Section */}
        <div className="space-y-4 mt-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">My Groups</h2>
            {showCreateCommunity ? (
              <CreateCommunity
                onSuccess={async (newCommunity: Community) => {
                  try {
                    console.log('Starting community setup with:', newCommunity);
                    
                    const communityWithTimestamp = {
                      ...newCommunity,
                      created_at: new Date().toISOString()
                    };
                    
                    if (!newCommunity.id) {
                      throw new Error('Community creation failed - no ID returned');
                    }

                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    
                    if (userError || !user) {
                      throw new Error('Failed to get current user');
                    }

                    const { error: memberError } = await supabase
                      .from('community_members')
                      .insert({
                        community_id: newCommunity.id,
                        user_id: user.id,
                        user_role: 'admin'
                      });

                    if (memberError) {
                      throw memberError;
                    }

                    if (newCommunity.start_date) {
                      const startDate = new Date(newCommunity.start_date);
                      const dayBefore = new Date(startDate);
                      dayBefore.setDate(dayBefore.getDate() - 1);
                      const dayAfter = new Date(startDate);
                      dayAfter.setDate(dayAfter.getDate() + 1);

                      const { data: photos, error: photosError } = await supabase
                        .from('photos')
                        .select('*')
                        .eq('user_id', user.id)
                        .gte('created_at', dayBefore.toISOString())
                        .lte('created_at', dayAfter.toISOString());

                      if (photosError) {
                        throw photosError;
                      }

                      if (photos && photos.length > 0) {
                        const { error: updateError } = await supabase
                          .from('photos')
                          .update({ community_id: newCommunity.id })
                          .in('id', photos.map(photo => photo.id));

                        if (updateError) {
                          throw updateError;
                        }

                        toast.success(`Added ${photos.length} photos to the community`);
                      }
                    }

                    setGroups([...groups, communityWithTimestamp]);
                    setShowCreateCommunity(false);
                    toast.success('Community created successfully');
                  } catch (error) {
                    console.error('Error in community creation:', error);
                    toast.error('Failed to set up community');
                  }
                }}
                onCancel={() => setShowCreateCommunity(false)}
              />
            ) : (
              <Button 
                onClick={() => setShowCreateCommunity(true)} 
                className="bg-camera-controls hover:bg-opacity-80"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Community
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center bg-camera-controls gap-3"
              >
                <div className="flex items-center gap-3 flex-grow">
                  <Users className="w-5 h-5" />
                  {editingGroupId === group.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <Input
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        placeholder="Group name"
                        className="bg-camera-controls border-none text-white"
                      />
                      <Input
                        type="date"
                        value={editingGroupDate.split('T')[0]} // Format the date for the input
                        onChange={(e) => setEditingGroupDate(e.target.value)}
                        className="bg-camera-controls border-none text-white"
                      />
                      <Button 
                        onClick={() => handleUpdateGroup(group.id)}
                        className="mt-2"
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span>{group.name}</span>
                      <span className="text-sm text-gray-400">
                        {group.start_date ? new Date(group.start_date).toLocaleDateString() : 'No start date set'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/community/${group.id}/gallery`)}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white transition-all duration-300 hover:from-red-500 hover:via-pink-500 hover:to-purple-500 w-full sm:w-auto"
                  >
                    <Image className="w-4 h-4" />
                    View album
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingGroupId(group.id);
                        setEditingGroupName(group.name);
                        setEditingGroupDate(group.start_date || ''); // Use start_date instead of created_at
                      }}
                      className="hover:bg-opacity-80"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShareLink(group.id)}
                      className="hover:bg-opacity-80"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="hover:bg-opacity-80 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Move the Disconnect button to the bottom and center it */}
      <div className="flex justify-center mt-4">
        <Button 
          onClick={handleSignOut}
          variant="destructive"
          className="bg-red-600 hover:bg-red-700"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
};

export default User;