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
    const dummyLink = `https://yourapp.com/join/${groupId}`;
    navigator.clipboard.writeText(dummyLink);
    toast.success('Invite link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-8 dark:bg-gray-900">
      {/* Header with navigation */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground dark:text-white">Profile</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="dark:hover:bg-gray-800">
          <Camera className="w-6 h-6 dark:text-white" />
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
              className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer dark:bg-blue-600 hover:opacity-90 transition-opacity"
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
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="max-w-xs dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Groups Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-foreground dark:text-white">My Groups</h2>
          <Button onClick={() => setShowCreateGroup(true)} className="dark:hover:bg-blue-700">
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
              className="dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:placeholder-gray-400"
            />
            <Button onClick={handleCreateGroup} className="dark:hover:bg-blue-700">Create</Button>
          </div>
        )}

        <div className="grid gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-4 border rounded-lg flex justify-between items-center dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5" />
                <span>{group.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleShareLink(group.id)}
                className="dark:hover:bg-gray-700"
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