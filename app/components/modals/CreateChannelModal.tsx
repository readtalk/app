import { useState } from 'react';
import { useChatContext } from '~/providers/ChatProvider';
import type { User } from '~/types/chat';

type CreateChannelModalProps = {
  onClose: () => void;
}

export const CreateChannelModal = ({ onClose }: CreateChannelModalProps) => {
  const { users, addChannel } = useChatContext();
  const currentUserId = localStorage.getItem('userId') || '';
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([currentUserId]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('https://readtalk.soeparnocorp.workers.dev/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('session') || ''
        },
        body: JSON.stringify({
          name: channelName,
          description,
          is_private: false,
          member_ids: selectedUsers
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create channel');
      }

      addChannel(data.channel);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create channel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-4 bg-neutral-100 dark:bg-neutral-900">
      <h2 className="text-xl font-semibold mb-4">Create a new channel</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Channel name
          </label>
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="w-full p-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            placeholder="e.g. project-discussion"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            placeholder="What's this channel about?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Add members
          </label>
          <div className="max-h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const isChecked = selectedUsers.includes(user.id);
              const isDisabled = isCurrentUser;

              return (
                <label
                  key={user.id}
                  className={`flex items-center px-3 py-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={(e) => {
                      setSelectedUsers(prev =>
                        e.target.checked
                          ? [...prev, user.id]
                          : prev.filter(id => id !== user.id)
                      );
                    }}
                    className="rounded border-neutral-300 dark:border-neutral-700 mr-2"
                  />
                  {user.first_name} {user.last_name}
                </label>
              );
            })}
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
            disabled={isLoading || !channelName.trim()}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Channel'}
          </button>
        </div>
      </form>
    </div>
  );
};
