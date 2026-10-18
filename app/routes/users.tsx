import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useChatContext } from '~/providers/ChatProvider';
import { ChatCircleDots, ArrowLeft, Heart, Repeat, PaperPlaneRight } from "@phosphor-icons/react";
import type { User } from '~/types/chat';

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

    const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('session') || '' : '';

    const currentUser = useMemo(() => {
        if (!myUserId) return null;
        return users.find(u => u.id === myUserId) || null;
    }, [users, myUserId]);

    const username = handle?.startsWith('@') ? handle.slice(1) : handle;
    const user = useMemo(() => users.find(u => u.username === username), [users, username]);

    useEffect(() => {
        if (!user || !currentUser) {
            setIsLoadingUpdates(false);
            return;
        }

        const fetchUpdates = async () => {
            try {
                const res = await fetch(`https://readtalk.soeparnocorp.workers.dev/updates?userId=${user.id}`, {
                    headers: {
                        'X-Session-Id': sessionId
                    }
                });
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
    }, [user, currentUser, sessionId]);

    if (!currentUser) {
        return <div className="p-4 text-center text-neutral-500">?</div>;
    }

    if (!user) {
        return <div className="p-4">User not found</div>;
    }

    const fullName = `${user.first_name} ${user.last_name}`;
    const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-950 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 p-4 flex items-center gap-4">
                <button 
                    onClick={() => navigate('/overview')} 
                    className="md:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                >
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
                    </div>

                    {myUserId !== user.id && (
                        <button 
                            onClick={async () => {
                                const existingDM = channels.find(c =>
                                    c.is_private &&
                                    c.member_ids.length === 2 &&
                                    c.member_ids.includes(myUserId!) &&
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
                                            'X-Session-Id': sessionId
                                        },
                                        body: JSON.stringify({
                                            name: 'Chat',
                                            description: 'Private Mode',
                                            is_private: true,
                                            member_ids: [myUserId, user.id]
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
                            }}
                            disabled={isCreatingChat}
                            className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <ChatCircleDots size={18} weight="fill" /> {isCreatingChat ? 'Loading...' : 'Chat'}
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
                                    <span className="text-sm text-neutral-500">· {new Date(update.created_at * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="mt-1 text-neutral-900 dark:text-white whitespace-pre-wrap break-words">{update.content}</p>
                                <div className="flex items-center gap-6 mt-3 text-neutral-500">
                                    <button className="flex items-center gap-1 hover:text-blue-500 transition-colors"><ChatCircleDots size={18} /> <span className="text-sm">0</span></button>
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
