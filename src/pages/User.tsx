import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, Users, Link as LinkIcon, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const User = () => {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('');
  const [groups, setGroups] = React.useState<{ id: string; name: string }[]>([]);
  const [showCreateGroup, setShowCreateGroup] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // This will be handled by Supabase storage later
      toast.info('Profile picture upload will be available soon');
    }
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      const newGroup = {
        id: Math.random().toString(36).substr(2, 9),
        name: newGroupName.trim()
      };
      setGroups([...groups, newGroup]);
      setNewGroupName('');
      setShowCreateGroup(false);
      toast.success('Group created successfully');
    }
  };

  const handleShareLink = (groupId: string) => {
    // This will be handled by backend later
    const dummyLink = `https://yourapp.com/join/${groupId}`;
    navigator.clipboard.writeText(dummyLink);
    toast.success('Invite link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Header with navigation */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <Camera className="w-6 h-6" />
        </Button>
      </div>

      {/* Profile Section */}
      <div className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7" />
              <AvatarFallback>
                <Image className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <label 
              className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer"
              htmlFor="profile-picture"
            >
              <Image className="w-4 h-4 text-primary-foreground" />
            </label>
            <input
              type="file"
              id="profile-picture"
              className="hidden"
              accept="image/*"
              onChange={handleProfilePictureUpload}
            />
          </div>
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Groups Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">My Groups</h2>
          <Button onClick={() => setShowCreateGroup(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>

        {showCreateGroup && (
          <div className="flex gap-2">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Button onClick={handleCreateGroup}>Create</Button>
          </div>
        )}

        <div className="grid gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-4 border rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5" />
                <span>{group.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShareLink(group.id)}
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default User;