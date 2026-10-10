import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '~/providers/ChatProvider';

type CreatePrivateModalProps = {
  onClose: () => void;
}

export const CreatePrivateModal = ({ onClose }: CreatePrivateModalProps) => {
  const { users, channels, addChannel } = useChatContext();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId') || '';
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherUsers = users.filter(user => user.id !== currentUserId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError(null);

    const existingDM = channels.find(c =>
      c.is_private &&
      c.member_ids.length === 2 &&
      c.member_ids.includes(currentUserId) &&
      c.member_ids.includes(selectedUser)
    );

    if (existingDM) {
      onClose();
      navigate(`/channel/${existingDM.id}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://readtalk.soeparnocorp.workers.dev/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('session') || ''
        },
        body: JSON.stringify({
          name: 'ChatRoom',
          description: 'Private Mode',
          is_private: true,
          member_ids: [currentUserId, selectedUser]
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to create DM');
      }

      addChannel(data.channel);
      onClose();
      navigate(`/channel/${data.channel.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create DM');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-4 bg-neutral-100 dark:bg-neutral-900">
      <h2 className="text-xl font-semibold mb-4">New direct message</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Select user
          </label>
          <div className="max-h-60 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
            {otherUsers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-neutral-500">
                No users available
              </div>
            ) : (
              otherUsers.map((user) => {
                const isSelected = selectedUser === user.id;
                return (
                  <label
                    key={user.id}
                    className={`flex items-center px-3 py-2 cursor-pointer ${isSelected ? 'bg-red-50 dark:bg-red-950' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  >
                    <input
                      type="radio"
                      name="selectedUser"
                      checked={isSelected}
                      onChange={() => setSelectedUser(user.id)}
                      className="border-neutral-300 dark:border-neutral-700 mr-2"
                    />
                    {user.first_name} {user.last_name}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !selectedUser}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Start Chat'}
          </button>
        </div>
      </form>
    </div>
  );
};
