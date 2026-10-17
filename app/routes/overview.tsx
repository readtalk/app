import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useChatContext } from "~/providers/ChatProvider";
import { ChatCircle, Heart, Repeat, PaperPlaneRight, Image as ImageIcon } from "@phosphor-icons/react";
import type { User } from "~/types/chat";

type Update = {
    id: string;
    user_id: string;
    content: string;
    image_url: string | null;
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

export default function Overview() {
    const navigate = useNavigate();
    const { users } = useChatContext();
    const [updates, setUpdates] = useState<Update[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [content, setContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('session') || '' : '';

    const userMap = useMemo(() => {
        return users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {} as Record<string, User>);
    }, [users]);

    const fetchUpdates = async () => {
        try {
            const res = await fetch('https://readtalk.soeparnocorp.workers.dev/updates', {
                headers: {
                    'X-Session-Id': sessionId
                }
            });
            const data = await res.json();
            if (data.success) {
                setUpdates(data.updates);
            }
        } catch (error) {
            console.error("Failed to fetch updates", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUpdates();
    }, []);

    const handlePost = async () => {
        if (!content.trim() || isPosting || content.length > 140) return;
        setIsPosting(true);
        try {
            const res = await fetch('https://readtalk.soeparnocorp.workers.dev/updates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId
                },
                body: JSON.stringify({ content, image_url: imageUrl })
            });
            const data = await res.json();
            if (data.success) {
                setUpdates([data.update, ...updates]);
                setContent("");
                setImageUrl(null);
            }
        } catch (error) {
            console.error("Failed to post update", error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('https://readtalk.soeparnocorp.workers.dev/channel/upload', {
                method: 'POST',
                headers: {
                    'X-Session-Id': sessionId,
                    'X-Channel-Id': 'updates'
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setImageUrl(data.url);
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleUserClick = (username: string | null) => {
        if (username) {
            navigate(`/users/@${username}`);
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return <div className="p-4 text-center text-neutral-500">Loading updates...</div>;
    }

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <div className="mb-4">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's happening?"
                    className="w-full bg-transparent text-lg text-neutral-900 dark:text-white resize-none outline-none placeholder:text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 pb-2"
                    rows={3}
                    maxLength={140}
                />
                {imageUrl && (
                    <div className="relative mt-2 inline-block">
                        <img src={imageUrl} alt="Preview" className="max-h-40 rounded-lg" />
                        <button
                            onClick={() => setImageUrl(null)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 text-xs"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors disabled:opacity-50"
                        >
                            <ImageIcon size={20} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            className="hidden"
                        />
                        <span className={`text-sm ${content.length > 140 ? 'text-red-500' : 'text-neutral-400'}`}>
                            {content.length}/140
                        </span>
                    </div>
                    <button
                        onClick={handlePost}
                        disabled={!content.trim() || isPosting || content.length > 140 || isUploading}
                        className="px-4 py-1.5 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isPosting ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                {updates.length === 0 ? (
                    <div className="text-center text-neutral-500">Belum ada update.</div>
                ) : (
                    updates.map((update) => {
                        const author = userMap[update.user_id];
                        if (!author) return null;

                        const fullName = `${author.first_name || ''} ${author.last_name || ''}`;
                        const initials = `${author.first_name?.[0] || ''}${author.last_name?.[0] || ''}`.toUpperCase();

                        return (
                            <div key={update.id} className="flex gap-3 py-4 border-b border-neutral-200 dark:border-neutral-800">
                                <button onClick={() => handleUserClick(author.username)} className="flex-shrink-0">
                                    {author.avatar ? (
                                        <img src={author.avatar} alt={fullName} className="size-10 rounded-full object-cover" />
                                    ) : (
                                        <div
                                            className="size-10 rounded-full flex items-center justify-center text-white font-medium"
                                            style={{ backgroundColor: getColorFromName(fullName) }}
                                        >
                                            {initials}
                                        </div>
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleUserClick(author.username)} className="font-bold text-neutral-900 dark:text-white hover:underline">
                                            {fullName}
                                        </button>
                                        {author.username && (
                                            <span className="text-sm text-neutral-500">@{author.username}</span>
                                        )}
                                        <span className="text-sm text-neutral-500">· {formatTime(update.created_at)}</span>
                                    </div>
                                    <p className="mt-1 text-neutral-900 dark:text-white whitespace-pre-wrap break-words">
                                        {update.content}
                                    </p>
                                    {update.image_url && (
                                        <div className="mt-2">
                                            <img src={update.image_url} alt="Attached" className="max-h-96 rounded-xl border border-neutral-200 dark:border-neutral-800" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-6 mt-3 text-neutral-500">
                                        <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                                            <ChatCircle size={18} /> <span className="text-sm">0</span>
                                        </button>
                                        <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
                                            <Repeat size={18} /> <span className="text-sm">0</span>
                                        </button>
                                        <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                                            <Heart size={18} /> <span className="text-sm">0</span>
                                        </button>
                                        <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                                            <PaperPlaneRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
