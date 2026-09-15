import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { Avatar } from '~/components/avatar/Avatar';
import { Button } from '~/components/button/Button';
import { Input } from '~/components/input/Input';
import { Label } from '~/components/label/Label';
import { Card } from '~/components/card/Card';
import { Loader } from '~/components/loader/Loader';
import { UploadAvatarModal } from '~/components/modals/UploadAvatarModal';

export default function Profile() {
  const navigate = useNavigate();
  
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
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
    setIsLoading(false);
  }, []);

  const handleSave = async () => {
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
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSuccess = (url: string) => {
    setAvatar(url);
    setShowUploadModal(false);
    handleSave();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Profile Settings
        </h1>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </div>

      <Card className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar
              image={avatar}
              username={fullName || 'User'}
              size="base"
              className="h-20 w-20 ring-2 ring-white dark:ring-neutral-800"
            />
            <button
              onClick={() => setShowUploadModal(true)}
              className="absolute -bottom-1 -right-1 rounded-full bg-[#FF0000] p-1.5 text-white shadow-lg transition hover:bg-[#CC0000]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Profile Avatar
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Upload a new avatar.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
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
        </div>

        {/* Error & Success */}
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving}
          >
            Save Changes
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </Card>

      {showUploadModal && (
        <UploadAvatarModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleAvatarSuccess}
        />
      )}
    </div>
  );
}
