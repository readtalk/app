//
import { useState, useEffect } from 'react';
import { useChatContext } from '~/providers/ChatProvider';
import { Input } from '~/components/input/Input';
import { Label } from '~/components/label/Label';
import type { Socials } from '~/types/chat';

type ProfileModalProps = {
  onClose: () => void;
}

const emptySocials: Socials = {
  bluesky: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  x: '',
  youtube: '',
  linkedin: '',
};

const socialFields: { key: keyof Socials; label: string }[] = [
  { key: 'bluesky', label: 'BlueSky' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'x', label: 'X' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'linkedin', label: 'LinkedIn' },
];

export const ProfileModal = ({ onClose }: ProfileModalProps) => {
  const { users } = useChatContext();
  const currentUserId = localStorage.getItem('userId') || '';
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [socials, setSocials] = useState<Socials>(emptySocials);
  const [usernameUpdatedAt, setUsernameUpdatedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setFullName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
        setUsername(user.username || '');
        setEmail(user.email || '');
        setAvatar(user.avatar || '');
        setBio(user.bio || '');
        setSocials({ ...emptySocials, ...(user.socials || {}) });
        setUsernameUpdatedAt(user.username_updated_at ?? null);
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
  }, []);

  const handleSocialChange = (key: keyof Socials, value: string) => {
    setSocials(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const sessionId = localStorage.getItem('session');
      const [firstName, ...lastNameParts] = fullName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || '';

      const cleanedSocials: Socials = {};
      Object.entries(socials).forEach(([key, value]) => {
        if (value?.trim()) {
          cleanedSocials[key as keyof Socials] = value.trim();
        }
      });

      const response = await fetch('https://readtalk.soeparnocorp.workers.dev/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId || ''
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          avatar,
          username,
          bio,
          socials: cleanedSocials
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update profile');
      }

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const isUsernameLocked = usernameUpdatedAt
    ? (Math.floor(Date.now() / 1000) - usernameUpdatedAt) < (100 * 24 * 60 * 60)
    : false;

  return (
    <div className="w-full max-w-lg p-4 bg-neutral-100 dark:bg-neutral-900">
      <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Label title="Full Name" required>
            <Input
              type="text"
              value={fullName}
              onValueChange={(value) => setFullName(value)}
              placeholder="Enter your full name"
              size="base"
            />
          </Label>
        </div>

        <div>
          <Label title="Username" required>
            <Input
              type="text"
              value={username}
              onValueChange={(value) => setUsername(value)}
              placeholder="Enter username (max 14)"
              size="base"
              disabled={isUsernameLocked}
              className={isUsernameLocked ? 'cursor-not-allowed opacity-60' : ''}
            />
          </Label>
          {isUsernameLocked && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Username can only be changed once every 100 days
            </p>
          )}
        </div>

        <div>
          <Label title="Email" required>
            <Input
              type="email"
              value={email}
              onValueChange={(value) => setEmail(value)}
              placeholder="Enter your email"
              size="base"
              disabled
              className="cursor-not-allowed bg-neutral-100 dark:bg-neutral-800"
            />
          </Label>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Email cannot be changed
          </p>
        </div>

        <div>
          <Label title="Avatar URL">
            <Input
              type="text"
              value={avatar}
              onValueChange={(value) => setAvatar(value)}
              placeholder="https://..."
              size="base"
            />
          </Label>
        </div>

        <div>
          <Label title="About">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={140}
              rows={3}
              placeholder="Tell people about yourself (max 140)"
              className="w-full p-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-base resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </Label>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 text-right">
            {bio.length}/140
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2 text-neutral-900 dark:text-white">
            Social Links
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Enter username only, without https:// or domain
          </p>
          <div className="space-y-3">
            {socialFields.map(({ key, label }) => (
              <div key={key}>
                <Label title={label}>
                  <Input
                    type="text"
                    value={socials[key] || ''}
                    onValueChange={(value) => handleSocialChange(key, value)}
                    placeholder={`Your ${label} username`}
                    size="base"
                  />
                </Label>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            {successMessage}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !fullName.trim()}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
