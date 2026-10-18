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

type Comment = {
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

    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [commentInput, setCommentInput] = useState("");
    const [isSendingComment, setIsSendingComment] = useState(false);

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
                headers: { 'X-Session-Id': sessionId }
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
            if (data.success) setImageUrl(data.url);
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleLike = async (id: string) => {
        try {
            await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}/like`, {
                method: 'POST',
                headers: { 'X-Session-Id': sessionId }
            });
        } catch (error) {
            console.error("Failed to like", error);
        }
    };

    const handleRepost = async (id: string) => {
        try {
            await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}/repost`, {
                method: 'POST',
                headers: { 
                    'X-Session-Id': sessionId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: null })
            });
        } catch (error) {
            console.error("Failed to repost", error);
        }
    };

    const handleToggleComments = async (id: string) => {
        if (activeCommentPostId === id) {
            setActiveCommentPostId(null);
            return;
        }
        setActiveCommentPostId(id);
        
        if (!comments[id]) {
            try {
                const res = await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}/comments`, {
                    headers: { 'X-Session-Id': sessionId }
                });
                const data = await res.json();
                if (data.success) {
                    setComments(prev => ({ ...prev, [id]: data.comments }));
                }
            } catch (error) {
                console.error("Failed to fetch comments", error);
            }
        }
    };

    const handleSendComment = async (e: React.FormEvent, id: string) => {
        e.preventDefault();
        if (!commentInput.trim() || isSendingComment) return;
        setIsSendingComment(true);
        try {
            const res = await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId
                },
                body: JSON.stringify({ content: commentInput })
            });
            const data = await res.json();
            if (data.success) {
                setComments(prev => ({
                    ...prev,
                    [id]: [...(prev[id] || []), data.comment]
                }));
                setCommentInput("");
            }
        } catch (error) {
            console.error("Failed to send comment", error);
        } finally {
            setIsSendingComment(false);
        }
    };

    const handleUserClick = (username: string | null) => {
        if (username) navigate(`/users/@${username}`);
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return <div className="p-4 text-center text-neutral-500">Loading updates...</div>;
    }

    return (
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
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
                        const isCommentActive = activeCommentPostId === update.id;

                        return (
                            <div key={update.id} className="flex flex-col py-4 border-b border-neutral-200 dark:border-neutral-800">
                                <div className="flex gap-3">
                                    <button onClick={() => handleUserClick(author.username)} className="flex-shrink-0">
                                        {author.avatar ? (
                                            <img src={author.avatar} alt={fullName} className="size-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="size-10 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: getColorFromName(fullName) }}>
                                                {initials}
                                            </div>
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleUserClick(author.username)} className="font-bold text-neutral-900 dark:text-white hover:underline">
                                                {fullName}
                                            </button>
                                            {author.username && <span className="text-sm text-neutral-500">@{author.username}</span>}
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
                                            <button onClick={() => handleToggleComments(update.id)} className={`flex items-center gap-1 transition-colors ${isCommentActive ? 'text-blue-500' : 'hover:text-blue-500'}`}>
                                                <ChatCircle size={18} /> <span className="text-sm">{isCommentActive && comments[update.id] ? comments[update.id].length : ''}</span>
                                            </button>
                                            <button onClick={() => handleRepost(update.id)} className="flex items-center gap-1 hover:text-green-500 transition-colors">
                                                <Repeat size={18} /> <span className="text-sm"></span>
                                            </button>
                                            <button onClick={() => handleLike(update.id)} className="flex items-center gap-1 hover:text-red-500 transition-colors">
                                                <Heart size={18} /> <span className="text-sm"></span>
                                            </button>
                                            <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                                                <PaperPlaneRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {isCommentActive && (
                                    <div className="mt-3 ml-12 border-l-2 border-neutral-200 dark:border-neutral-800 pl-3">
                                        {comments[update.id]?.map((comment) => {
                                            const commentAuthor = userMap[comment.user_id];
                                            if (!commentAuthor) return null;
                                            return (
                                                <div key={comment.id} className="mb-3 text-sm">
                                                    <span className="font-semibold text-neutral-900 dark:text-white">{commentAuthor.first_name} {commentAuthor.last_name}</span>
                                                    <span className="text-neutral-500 ml-1 text-xs">· {formatTime(comment.created_at)}</span>
                                                    <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">{comment.content}</p>
                                                </div>
                                            );
                                        })}
                                        <form onSubmit={(e) => handleSendComment(e, update.id)} className="flex items-center gap-2 mt-2">
                                            <input
                                                type="text"
                                                value={commentInput}
                                                onChange={(e) => setCommentInput(e.target.value)}
                                                placeholder="Write a reply..."
                                                className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                                            />
                                            <button type="submit" disabled={!commentInput.trim() || isSendingComment} className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-full hover:bg-red-600 disabled:opacity-50">
                                                Reply
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
