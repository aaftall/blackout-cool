import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, Users, Link as LinkIcon, PlusCircle, Pencil, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { profileApi } from '@/lib/api/profile';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { CreateCommunity } from '@/components/CreateCommunity';
import DatePicker from 'react-datepicker';

type CommunityMember = {
  community: {
    id: string;
    name: string;
    created_by: string;
    start_date: string | null;
    end_date: string | null;
  };
  user_role: string;
}

type Community = Database['public']['Tables']['communities']['Row'] & {
  end_date?: string | null;
  user_role: string;
  member_count: number;
};

const isAlbumViewable = (endDate: string | null) => {
  if (!endDate) return false;
  return new Date() > new Date(endDate);
};

const User = () => {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('');
  const [groups, setGroups] = React.useState<Community[]>([]);
  const [showCreateCommunity, setShowCreateCommunity] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [editingCommunityId, setEditingCommunityId] = React.useState<string | null>(null);
  const [editingCommunityName, setEditingCommunityName] = React.useState('');
  const [editingCommunityDate, setEditingCommunityDate] = React.useState('');
  const [editingCommunityEndDate, setEditingCommunityEndDate] = React.useState('');
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    // Check for pending invite on mount
    const pendingInvite = localStorage.getItem('pendingInviteLink');
    if (pendingInvite) {
      handleJoinCommunity(pendingInvite);
      localStorage.removeItem('pendingInviteLink');
    }
  }, []);

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
          setAvatarUrl(profile.avatar_url || null);
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
              end_date,
              created_by,
              community_members (count)
            ),
            user_role
          `)
          .eq('user_id', user.id);

        console.log('User Communities:', userCommunities);
        console.log('Member Error:', memberError);

        if (memberError) {
          console.error('Communities fetch error:', memberError);
          toast.error('Failed to load communities');
        } else {
          const communities = userCommunities?.map(member => ({
            ...member.community,
            user_role: member.user_role,
            member_count: member.community.community_members[0].count
          })) || [];
          setGroups(communities);
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

  const handleShareLink = (communityId: string) => {
    const domain = window.location.origin;
    const inviteLink = `${domain}/login/join/${communityId}`;
    
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        toast.success('Invite link copied to clipboard');
      })
      .catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = inviteLink;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          toast.success('Invite link copied to clipboard');
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
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const handleDeleteGroup = async (communityId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this community?');
    if (!confirmDelete) return;

    try {
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      // Check if user is admin
      const { data: membership, error: membershipError } = await supabase
        .from('community_members')
        .select('user_role')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      if (membershipError) {
        console.error('Membership check error:', membershipError);
        toast.error('Failed to verify permissions');
        return;
      }

      if (membership?.user_role !== 'admin') {
        toast.error('Only admins can delete communities');
        return;
      }

      // First delete all community members
      const { error: membersError } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId);

      if (membersError) {
        console.error('Failed to delete members:', membersError);
        toast.error('Failed to delete community members');
        return;
      }

      // Then delete the community
      const { error: communityError } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId);
      
      if (communityError) {
        console.error('Failed to delete community:', communityError);
        toast.error('Failed to delete community');
        return;
      }
      
      setGroups(groups.filter(group => group.id !== communityId));
      toast.success('Community deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete community');
    }
  };

  const handleUpdateGroup = async (communityId: string) => {
    try {
      const formattedStartDate = editingCommunityDate ? new Date(editingCommunityDate).toISOString() : null;
      const formattedEndDate = editingCommunityEndDate ? new Date(editingCommunityEndDate).toISOString() : null;

      const { error } = await supabase
        .from('communities')
        .update({ 
          name: editingCommunityName,
          start_date: formattedStartDate,
          end_date: formattedEndDate
        })
        .eq('id', communityId);
      
      if (error) throw error;
      
      setGroups(groups.map(group => 
        group.id === communityId ? { 
          ...group, 
          name: editingCommunityName,
          start_date: formattedStartDate,
          end_date: formattedEndDate
        } : group
      ));
      setEditingCommunityId(null);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update community');
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in');
        return;
      }

      const { error: joinError } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          user_role: 'member',
          joined_at: new Date().toISOString()
        });

      if (joinError) {
        if (joinError.code === '23505') {
          toast.success('Already a member of this community');
          navigate(`/community/${communityId}/gallery`);
          return;
        }
        throw joinError;
      }

      toast.success('You are in! BO like at a Sete');
      navigate(`/community/${communityId}/gallery`);
    } catch (error) {
      console.error('Join error:', error);
      toast.error('Failed to join community');
    }
  };

  const handleInviteLinkSubmit = () => {
    const communityId = inviteLink.split('/join/')[1]?.split('/')[0];
    if (communityId) {
      handleJoinCommunity(communityId);
    } else {
      toast.error('Invalid invite link');
    }
  };

  const handleViewAlbum = (group: Community) => {
    if (!isAlbumViewable(group.end_date)) {
      const diffTime = group.end_date ? new Date(group.end_date).getTime() - new Date().getTime() : 0;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      
      let timeMessage;
      if (diffDays > 1) {
        timeMessage = `${diffDays} days`;
      } else if (diffHours > 1) {
        timeMessage = `${diffHours} hours`;
      } else {
        timeMessage = 'less than an hour';
      }
      
      toast.error(`${group.name} album will be available in ${timeMessage}`);
      return;
    }
    
    navigate(`/community/${group.id}/gallery`);
  };

  const handleLeaveCommunity = async (communityId: string) => {
    const confirmLeave = window.confirm('Are you sure you want to leave this community?');
    if (!confirmLeave) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;

      setGroups(groups.filter(group => group.id !== communityId));
      toast.success('Successfully left the community');
    } catch (error) {
      console.error('Leave error:', error);
      toast.error('Failed to leave community');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col justify-between">
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

        <div className="space-y-4 mt-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">My BO</h2>
            {showCreateCommunity ? (
              <CreateCommunity
                onSuccess={async (community: { id: string; name: string; start_date?: string | null; end_date?: string | null }) => {
                  const startDate = community.start_date || undefined;
                  const endDate = community.end_date || undefined;
                  try {
                    console.log('Starting community setup with:', { ...community, start_date: startDate, end_date: endDate });
                    
                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    if (userError || !user) {
                      throw new Error('Failed to get current user');
                    }
                    
                    const communityWithTimestamp = {
                      ...community,
                      created_at: new Date().toISOString(),
                      created_by: user.id,
                      start_date: community.start_date || null,
                      end_date: community.end_date || null,
                      user_role: 'admin',
                      member_count: 1
                    } satisfies Community;
                    
                    if (!community.id) {
                      throw new Error('Community creation failed - no ID returned');
                    }

                    const { error: memberError } = await supabase
                      .from('community_members')
                      .insert({
                        community_id: community.id,
                        user_id: user.id,
                        user_role: 'admin'
                      });

                    if (memberError) {
                      throw memberError;
                    }

                    if (community.start_date) {
                      const startDate = new Date(community.start_date);
                      const dayBefore = new Date(startDate);
                      dayBefore.setDate(dayBefore.getDate() - 1);
                      const dayAfter = new Date(startDate);
                      dayAfter.setDate(dayAfter.getDate() + 1);

                      const { data: photos, error: photosError } = await supabase
                        .from('photos')
                        .select('*')
                        .eq('user_id', user.id)
                        .is('community_id', null)
                        .gte('created_at', dayBefore.toISOString())
                        .lte('created_at', dayAfter.toISOString());

                      if (photosError) {
                        throw photosError;
                      }

                      if (photos && photos.length > 0) {
                        const { error: updateError } = await supabase
                          .from('photos')
                          .update({ community_id: community.id })
                          .in('id', photos.map(photo => photo.id));

                        if (updateError) {
                          throw updateError;
                        }

                        toast.success(`Added ${photos.length} photos to the community`);
                      }
                    }

                    setGroups([...groups, communityWithTimestamp]);
                    setShowCreateCommunity(false);
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
                Create a Blackout
              </Button>
            )}
          </div>

          <div className="p-4 rounded-lg bg-camera-controls">
            <h3 className="text-lg font-semibold mb-2">Join a BO</h3>
            <div className="flex gap-2">
              <Input
                type="text"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="Paste invite link here"
                className="flex-1 bg-black/20 border-none text-white placeholder-white/50"
              />
              <Button 
                onClick={handleInviteLinkSubmit}
                className="bg-black hover:bg-black/90"
              >
                Join
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center bg-camera-controls gap-3"
              >
                <div className="flex items-center gap-3 flex-grow">
                  <div className="flex items-center gap-1">
                    <Users className="w-5 h-5" />
                    <span className="text-sm text-gray-400">
                      {group.member_count}
                    </span>
                  </div>
                  {editingCommunityId === group.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <Input
                        value={editingCommunityName}
                        onChange={(e) => setEditingCommunityName(e.target.value)}
                        placeholder="Group name"
                        className="bg-camera-controls border-none text-white"
                      />
                      <label className="text-white">Party starts</label>
                      <DatePicker
                        selected={editingCommunityDate ? new Date(editingCommunityDate) : null}
                        onChange={(date) => {
                          if (date) {
                            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00`;
                            setEditingCommunityDate(formattedDate);
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
                      <label className="text-white">Party ends</label>
                      <DatePicker
                        selected={editingCommunityEndDate ? new Date(editingCommunityEndDate) : null}
                        onChange={(date) => {
                          if (date) {
                            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00`;
                            setEditingCommunityEndDate(formattedDate);
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
                        {group.end_date && ` - ${new Date(group.end_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                  <Button
                    variant="ghost"
                    onClick={() => handleViewAlbum(group)}
                    className={`flex items-center gap-2 ${
                      isAlbumViewable(group.end_date)
                        ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white transition-all duration-300 hover:from-red-500 hover:via-pink-500 hover:text-white hover:to-purple-500'
                        : 'bg-gray-500 text-gray-300'
                    } w-full sm:w-auto`}
                  >
                    <Image className="w-4 h-4" />
                    {isAlbumViewable(group.end_date) ? 'View album' : 'Album not ready'}
                  </Button>
                  <div className="flex gap-2">
                    {group.user_role === 'admin' ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCommunityId(group.id);
                            setEditingCommunityName(group.name);
                            setEditingCommunityDate(group.start_date || '');
                            setEditingCommunityEndDate(group.end_date || '');
                          }}
                          className="hover:bg-opacity-80"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="hover:bg-opacity-80 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLeaveCommunity(group.id)}
                        className="hover:bg-opacity-80 hover:text-red-500"
                        title="Leave community"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShareLink(group.id)}
                      className="hover:bg-opacity-80"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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