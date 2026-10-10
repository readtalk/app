import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatCircleDots, Phone, FacebookLogo, InstagramLogo, TiktokLogo, XLogo, YoutubeLogo, LinkedinLogo } from "@phosphor-icons/react";
import { useChatContext } from '~/providers/ChatProvider';
import type { User, Socials } from '~/types/chat';

type UserOverviewModalProps = {
  onClose: () => void;
  userId: string;
}

const BlueSkyLogo = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5.76537 7.01986C8.00566 8.70223 10.4166 12.1083 12 14.7675C13.5834 12.1083 15.9943 8.70223 18.2346 7.01986C19.8513 5.80651 22 4.92272 22 7.01986C22 7.42966 21.7649 10.1962 21.6369 10.5148C20.7999 12.8826 18.3087 13.4825 16.0844 13.1204C19.7118 13.7371 20.6294 15.9136 18.5524 18.0901C14.6345 22.1923 12.9286 17.0172 12.5263 15.751C12.4526 15.5213 12.4184 15.4142 12 15.4142C11.5816 15.4142 11.5474 15.5213 11.4737 15.751C11.0714 17.0172 9.36553 22.1923 5.44756 18.0901C3.37062 15.9136 4.28817 13.7371 7.91557 13.1204C5.69131 13.4825 3.20007 12.8826 2.36312 10.5148C2.23512 10.1962 2 7.42966 2 7.01986C2 4.92272 4.14868 5.80651 5.76537 7.01986Z" />
  </svg>
);

const socialsMap: Record<string, { label: string; icon: any; url: (u: string) => string }> = {
  bluesky: { label: "BlueSky", icon: BlueSkyLogo, url: (u) => `https://bsky.app/profile/${u}` },
  facebook: { label: "Facebook", icon: FacebookLogo, url: (u) => `https://facebook.com/${u}` },
  instagram: { label: "Instagram", icon: InstagramLogo, url: (u) => `https://instagram.com/${u}` },
  tiktok: { label: "TikTok", icon: TiktokLogo, url: (u) => `https://tiktok.com/@${u}` },
  x: { label: "X", icon: XLogo, url: (u) => `https://x.com/${u}` },
  youtube: { label: "YouTube", icon: YoutubeLogo, url: (u) => `https://youtube.com/@${u}` },
  linkedin: { label: "LinkedIn", icon: LinkedinLogo, url: (u) => `https://linkedin.com/in/${u}` },
};

const getColorFromName = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 50%)`;
};

export const UserOverviewModal = ({ onClose, userId }: UserOverviewModalProps) => {
  const { users, channels, addChannel } = useChatContext();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId') || '';
  const [error, setError] = useState<string | null>(null);

  const user: User | undefined = useMemo(() => {
    return users.find(u => u.id === userId);
  }, [users, userId]);

  if (!user) {
    return (
      <div className="w-full max-w-md p-6 bg-neutral-100 dark:bg-neutral-900">
        <p className="text-center text-neutral-500">User not found</p>
        <div className="flex justify-center mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${user.first_name} ${user.last_name}`;
  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  const socials: Socials = user.socials || {};

  const activeSocials = Object.entries(socials).filter(
    ([key, value]) => value && socialsMap[key]
  ) as [string, string][];

  const handleChat = async () => {
    const existingDM = channels.find(c =>
      c.is_private &&
      c.member_ids.length === 2 &&
      c.member_ids.includes(currentUserId) &&
      c.member_ids.includes(user.id)
    );

    if (existingDM) {
      onClose();
      navigate(`/channel/${existingDM.id}`);
      return;
    }

    try {
      const response = await fetch('https://readtalk.soeparnocorp.workers.dev/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('session') || ''
        },
        body: JSON.stringify({
          name: 'dm',
          description: null,
          is_private: true,
          member_ids: [currentUserId, user.id]
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create DM');
      }

      addChannel(data.channel);
      onClose();
      navigate(`/channel/${data.channel.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create DM');
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-neutral-100 dark:bg-neutral-900">
      <div className="flex flex-col items-center gap-3">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={fullName}
            className="size-28 rounded-full object-cover border-4 border-neutral-200 dark:border-neutral-800"
          />
        ) : (
          <div
            className="size-28 rounded-full flex items-center justify-center text-white text-3xl font-bold"
            style={{ backgroundColor: getColorFromName(fullName) }}
          >
            {initials}
          </div>
        )}

        <div className="text-center">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {fullName}
          </h2>
          {user.username && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              @{user.username}
            </p>
          )}
        </div>
      </div>

      {user.bio && (
        <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-300 text-center">
          {user.bio}
        </p>
      )}

      {activeSocials.length > 0 && (
        <div className="mt-5 flex justify-center gap-4">
          {activeSocials.map(([key, value]) => {
            const social = socialsMap[key];
            const Icon = social.icon;
            return (
              <a
                key={key}
                href={social.url(value)}
                target="_blank"
                rel="noopener noreferrer"
                title={social.label}
                className="text-neutral-700 dark:text-neutral-300 hover:text-red-500 dark:hover:text-red-500 transition-colors"
              >
                <Icon size={24} weight="fill" />
              </a>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={handleChat}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium"
        >
          <ChatCircleDots size={18} weight="fill" />
          Chat
        </button>

        <button
          disabled
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed text-sm font-medium"
        >
          <Phone size={18} weight="fill" />
          Call
        </button>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs rounded-md text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          Close
        </button>
      </div>
    </div>
  );
};
