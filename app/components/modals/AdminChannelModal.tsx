import { useState, useMemo } from 'react';
import { X, UserMinus, Crown, ShieldCheck, ShieldSlash, Trash, ArrowsLeftRight } from "@phosphor-icons/react";
import { useChatContext } from '~/providers/ChatProvider';
import type { Channel } from '~/types/chat';

type AdminChannelModalProps = {
  onClose: () => void;
  channel: Channel;
}

export const AdminChannelModal = ({ onClose, channel }: AdminChannelModalProps) => {
  const { users, removeChannel } = useChatContext();
  const currentUserId = localStorage.getItem('userId') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const channelMembers = useMemo(() => {
    return users.filter(u => channel.member_ids.includes(u.id));
  }, [users, channel.member_ids]);

  const isAdmin = (userId: string) => channel.admin_ids.includes(userId);

  const callEndpoint = async (path: string, method: string, body?: Record<string, unknown>) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`https://readtalk.soeparnocorp.workers.dev/channels/${channel.id}/${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('session') || '',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKick = (userId: string) => callEndpoint('kick', 'POST', { userId });

  const handlePromote = (userId: string) => callEndpoint('promote', 'POST', { userId });

  const handleDemote = (userId: string) => callEndpoint('demote', 'POST', { userId });

  const handleTransfer = (userId: string) => callEndpoint('transfer', 'POST', { userId });

  const handleTogglePolicy = () => {
    const newPolicy = channel.invite_policy === 'admin' ? 'all' : 'admin';
    callEndpoint('policy', 'PUT', { invite_policy: newPolicy });
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`https://readtalk.soeparnocorp.workers.dev/channels/${channel.id}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': localStorage.getItem('session') || '',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete');
      }

      removeChannel(channel.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setConfirmDelete(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-4 bg-neutral-100 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Manage {channel.name}</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          <X size={20} weight="bold" />
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between p-3 rounded-md bg-white dark:bg-neutral-800">
        <div>
          <div className="text-sm font-medium">Invite policy</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {channel.invite_policy === 'admin' ? 'Only admins can invite' : 'All members can invite'}
          </div>
        </div>
        <button
          onClick={handleTogglePolicy}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
        >
          {channel.invite_policy === 'admin' ? 'Set: All' : 'Set: Admin'}
        </button>
      </div>

      <div className="mb-2">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
          Members ({channelMembers.length})
        </h3>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1">
        {channelMembers.map(user => {
          const userIsAdmin = isAdmin(user.id);
          const isMe = user.id === currentUserId;

          return (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-md bg-white dark:bg-neutral-800"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.first_name} ${user.last_name}`}
                  className="size-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="size-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium bg-neutral-500">
                  {user.first_name[0]}{user.last_name[0]}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium flex items-center gap-1">
                  {user.first_name} {user.last_name}
                  {userIsAdmin && <Crown size={14} weight="fill" className="text-yellow-500" />}
                </div>
                {isMe && <div className="text-xs text-neutral-500">You</div>}
              </div>

              {!isMe && (
                <div className="flex items-center gap-1">
                  {!userIsAdmin && (
                    <>
                      <button
                        onClick={() => handlePromote(user.id)}
                        disabled={isLoading}
                        title="Promote to admin"
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
                      >
                        <ShieldCheck size={16} className="text-green-500" />
                      </button>
                      <button
                        onClick={() => handleKick(user.id)}
                        disabled={isLoading}
                        title="Kick"
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
                      >
                        <UserMinus size={16} className="text-red-500" />
                      </button>
                    </>
                  )}

                  {userIsAdmin && (
                    <>
                      <button
                        onClick={() => handleDemote(user.id)}
                        disabled={isLoading}
                        title="Demote to member"
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
                      >
                        <ShieldSlash size={16} className="text-orange-500" />
                      </button>
                      <button
                        onClick={() => handleTransfer(user.id)}
                        disabled={isLoading}
                        title="Transfer ownership"
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
                      >
                        <ArrowsLeftRight size={16} className="text-blue-500" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <button
          onClick={handleDelete}
          disabled={isLoading || channelMembers.length > 1}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash size={16} weight="bold" />
          {confirmDelete ? 'Confirm delete?' : 'Delete group'}
        </button>
        {channelMembers.length > 1 && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 text-center">
            Kick all members before deleting
          </p>
        )}
      </div>
    </div>
  );
};
