import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Loader2, Save, User, AtSign, FileText, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [status, setStatus] = useState(profile?.status || '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    
    const { error } = await updateProfile({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      status: status.trim() || null,
    });

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
    }
    
    setLoading(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // For now, we'll use a data URL since storage bucket might not be set up
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        const { error } = await updateProfile({ avatar_url: base64 });
        
        if (error) {
          toast.error('Failed to update avatar');
        } else {
          toast.success('Avatar updated!');
          await refreshProfile();
        }
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload avatar');
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chat')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold">Edit Profile</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <Avatar className="w-32 h-32 border-4 border-primary/20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-3xl gradient-primary text-primary-foreground">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Camera className="w-8 h-8" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Click to change your profile picture
            </p>
          </div>

          {/* Username (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              Username
            </Label>
            <Input
              value={profile?.username || ''}
              disabled
              className="bg-muted text-white/70"
            />
            <p className="text-xs text-muted-foreground">
              Username cannot be changed
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Display Name
            </Label>
            <Input
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Bio
            </Label>
            <Textarea
              placeholder="Tell others about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/200
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Status
            </Label>
            <Input
              placeholder="What's on your mind?"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={100}
              className="text-white bg-background/50"
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
