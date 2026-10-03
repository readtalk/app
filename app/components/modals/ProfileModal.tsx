import { useState, useEffect } from 'react';
import { useChatContext } from '~/providers/ChatProvider';
import { Input } from '~/components/input/Input';
import { Label } from '~/components/label/Label';

type ProfileModalProps = {
  onClose: () => void;
}

export const ProfileModal = ({ onClose }: ProfileModalProps) => {
  const { users } = useChatContext();
  const currentUserId = localStorage.getItem('userId') || '';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setFullName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
        setEmail(user.email || '');
        setAvatar(user.avatar || '');
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const sessionId = localStorage.getItem('session');
      const [firstName, ...lastNameParts] = fullName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || '';

      const response = await fetch('https://readtalk.soeparnocorp.workers.dev/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId || ''
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, avatar })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
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
