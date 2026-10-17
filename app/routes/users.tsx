import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChatContext } from "~/providers/ChatProvider";
import { ChatCircle, Heart, Repeat, PaperPlaneRight, ArrowLeft, FacebookLogo, InstagramLogo, TiktokLogo, XLogo, YoutubeLogo, LinkedinLogo } from "@phosphor-icons/react";

const BlueSkyLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
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

type Update = {
    id: string;
    user_id: string;
    content: string;
    created_at: number;
};

const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 50%)`;
};

export default function UserProfile() {
    const { handle } = useParams();
    const navigate = useNavigate();
    const { users, channels, addChannel } = useChatContext();
    
    const [updates, setUpdates] = useState<Update[]>([]);
    const [isLoadingUpdates, setIsLoadingUpdates] = useState(true);
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    const username = handle?.startsWith('@') ? handle.slice(1) : handle;
    const user = users.find(u => u.username === username);
    const currentUserId = localStorage.getItem('userId') || '';

    useEffect(() => {
        if (!user) return;
        
        const fetchUpdates = async () => {
            try {
                const res = await fetch(`https://readtalk.soeparnocorp.workers.dev/updates?userId=${user.id}`);
                const data = await res.json();
                if (data.success) {
                    setUpdates(data.updates);
                }
            } catch (error) {
                console.error("Failed to fetch user updates", error);
            } finally {
                setIsLoadingUpdates(false);
            }
        };
        fetchUpdates();
    }, [user]);

    const handleChatClick = async () => {
        if (!user) return;

        const existingDM = channels.find(c =>
            c.is_private &&
            c.member_ids.length === 2 &&
            c.member_ids.includes(currentUserId) &&
            c.member_ids.includes(user.id)
        );

        if (existingDM) {
            navigate(`/channel/${existingDM.id}`);
            return;
        }

        setIsCreatingChat(true);
        try {
            const response = await fetch('https://readtalk.soeparnocorp.workers.dev/channels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': localStorage.getItem('session') || ''
                },
                body: JSON.stringify({
                    name: 'Chat',
                    description: 'Private Mode',
                    is_private: true,
                    member_ids: [currentUserId, user.id]
                })
            });
            const data = await response.json();
            if (data.success) {
                addChannel(data.channel);
                navigate(`/channel/${data.channel.id}`);
            }
        } catch (error) {
            console.error("Failed to create DM", error);
        } finally {
            setIsCreatingChat(false);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                <p className="text-neutral-500 text-lg">User not found</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-neutral-200 dark:bg-neutral-800 rounded-full text-sm font-medium">
                    Go Back
                </button>
            </div>
        );
    }

    const fullName = `${user.first_name} ${user.last_name}`;
    const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    const activeSocials = Object.entries(user.socials || {}).filter(([key, value]) => value && socialsMap[key]) as [string, string][];

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-950 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 p-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                    <ArrowLeft size={20} weight="bold" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-neutral-900 dark:text-white">{fullName}</h1>
                    <p className="text-sm text-neutral-500">{updates.length} Updates</p>
                </div>
            </div>

            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-4">
                        {user.avatar ? (
                            <img src={user.avatar} alt={fullName} className="size-24 rounded-full object-cover border-4 border-neutral-200 dark:border-neutral-800" />
                        ) : (
                            <div className="size-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-neutral-200 dark:border-neutral-800" style={{ backgroundColor: getColorFromName(fullName) }}>
                                {initials}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{fullName}</h2>
                            {user.username && <p className="text-neutral-500 mt-1">@{user.username}</p>}
                        </div>
                        {user.bio && <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">{user.bio}</p>}
                        {activeSocials.length > 0 && (
                            <div className="flex flex-wrap gap-4 mt-2">
                                {activeSocials.map(([key, value]) => {
                                    const social = socialsMap[key];
                                    const Icon = social.icon;
                                    return (
                                        <a key={key} href={social.url(value)} target="_blank" rel="noopener noreferrer" title={social.label} className="text-neutral-500 hover:text-red-500 transition-colors">
                                            <Icon size={22} weight="fill" />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {currentUserId !== user.id && (
                        <button 
                            onClick={handleChatClick}
                            disabled={isCreatingChat}
                            className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <ChatCircle size={18} weight="fill" /> {isCreatingChat ? 'Loading...' : 'Chat'}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1">
                {isLoadingUpdates ? (
                    <div className="flex justify-center p-8 text-neutral-500">Loading updates...</div>
                ) : updates.length === 0 ? (
                    <div className="flex justify-center p-8 text-neutral-500">Belum ada update.</div>
                ) : (
                    updates.map((update) => (
                        <div key={update.id} className="flex gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-neutral-900 dark:text-white">{fullName}</span>
                                    {user.username && <span className="text-sm text-neutral-500">@{user.username}</span>}
                                    <span className="text-sm text-neutral-500">· {formatTime(update.created_at)}</span>
                                </div>
                                <p className="mt-1 text-neutral-900 dark:text-white whitespace-pre-wrap break-words">{update.content}</p>
                                <div className="flex items-center gap-6 mt-3 text-neutral-500">
                                    <button className="flex items-center gap-1 hover:text-blue-500 transition-colors"><ChatCircle size={18} /> <span className="text-sm">0</span></button>
                                    <button className="flex items-center gap-1 hover:text-green-500 transition-colors"><Repeat size={18} /> <span className="text-sm">0</span></button>
                                    <button className="flex items-center gap-1 hover:text-red-500 transition-colors"><Heart size={18} /> <span className="text-sm">0</span></button>
                                    <button className="flex items-center gap-1 hover:text-red-500 transition-colors"><PaperPlaneRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
