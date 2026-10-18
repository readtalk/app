import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useChatContext } from "~/providers/ChatProvider";
import { ChatCircle, Heart, Repeat, PaperPlaneRight, Image as ImageIcon, DotsThree, Pencil, Trash } from "@phosphor-icons/react";
import type { User } from '~/types/chat';

type Update = {
    id: string;
    user_id: string;
    content: string;
    image_url: string | null;
    created_at: number;
    like_count: number;
    comment_count: number;
    repost_count: number;
    is_liked: boolean;
    is_reposted: boolean;
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

    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [commentInput, setCommentInput] = useState("");
    const [isSendingComment, setIsSendingComment] = useState(false);

    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('session') || '' : '';
    const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

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
                setUpdates([{ ...data.update, like_count: 0, comment_count: 0, repost_count: 0, is_liked: false, is_reposted: false }, ...updates]);
                setContent("");
                setImageUrl(null);
            }
        } catch (error) {
            console.error("Failed to post update", error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleEditSubmit = async (id: string) => {
        if (!editContent.trim() || editContent.length > 140) return;
        
        setUpdates(prev => prev.map(u => u.id === id ? { ...u, content: editContent } : u));
        setEditingId(null);

        try {
            await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId
                },
                body: JSON.stringify({ content: editContent })
            });
        } catch (error) {
            console.error("Failed to edit update", error);
            fetchUpdates();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this update?")) return;
        
        setUpdates(prev => prev.filter(u => u.id !== id));
        setActiveMenuId(null);

        try {
            await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}`, {
                method: 'DELETE',
                headers: { 'X-Session-Id': sessionId }
            });
        } catch (error) {
            console.error("Failed to delete update", error);
            fetchUpdates();
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
        setUpdates(prev => prev.map(u => 
            u.id === id 
                ? { ...u, is_liked: !u.is_liked, like_count: u.is_liked ? u.like_count - 1 : u.like_count + 1 } 
                : u
        ));

        try {
            await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}/like`, {
                method: 'POST',
                headers: { 'X-Session-Id': sessionId }
            });
        } catch (error) {
            console.error("Failed to like", error);
            setUpdates(prev => prev.map(u => 
                u.id === id 
                    ? { ...u, is_liked: !u.is_liked, like_count: u.is_liked ? u.like_count - 1 : u.like_count + 1 } 
                    : u
            ));
        }
    };

    const handleRepost = async (id: string) => {
        setUpdates(prev => prev.map(u => 
            u.id === id 
                ? { ...u, is_reposted: !u.is_reposted, repost_count: u.is_reposted ? u.repost_count - 1 : u.repost_count + 1 } 
                : u
        ));

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
            setUpdates(prev => prev.map(u => 
                u.id === id 
                    ? { ...u, is_reposted: !u.is_reposted, repost_count: u.is_reposted ? u.repost_count - 1 : u.repost_count + 1 } 
                    : u
            ));
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
        
        const tempComment = {
            id: `temp-${Date.now()}`,
            user_id: currentUserId || '',
            content: commentInput,
            created_at: Math.floor(Date.now() / 1000)
        };
        
        setComments(prev => ({
            ...prev,
            [id]: [...(prev[id] || []), tempComment]
        }));

        setUpdates(prev => prev.map(u => 
            u.id === id ? { ...u, comment_count: u.comment_count + 1 } : u
        ));
        
        setCommentInput("");
        setIsSendingComment(true);

        try {
            const res = await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': sessionId
                },
                body: JSON.stringify({ content: tempComment.content })
            });
            const data = await res.json();
            
            if (data.success) {
                setComments(prev => ({
                    ...prev,
                    [id]: prev[id].map(c => c.id === tempComment.id ? data.comment : c)
                }));
            }
        } catch (error) {
            console.error("Failed to send comment", error);
            setUpdates(prev => prev.map(u => 
                u.id === id ? { ...u, comment_count: u.comment_count - 1 } : u
            ));
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
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800" onClick={() => setActiveMenuId(null)}>
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
                        const isMyPost = currentUserId === update.user_id;
                        const isEditing = editingId === update.id;
                        const isMenuOpen = activeMenuId === update.id;

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
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleUserClick(author.username)} className="font-bold text-neutral-900 dark:text-white hover:underline">
                                                    {fullName}
                                                </button>
                                                {author.username && <span className="text-sm text-neutral-500">@{author.username}</span>}
                                                <span className="text-sm text-neutral-500">· {formatTime(update.created_at)}</span>
                                            </div>
                                            
                                            {isMyPost && !isEditing && (
                                                <div className="relative">
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : update.id); }} className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                                                        <DotsThree size={20} weight="bold" />
                                                    </button>
                                                    {isMenuOpen && (
                                                        <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-neutral-800 rounded-md shadow-lg border border-neutral-200 dark:border-neutral-700 z-10 py-1">
                                                            <button onClick={() => { setEditingId(update.id); setEditContent(update.content); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                                                                <Pencil size={14} /> Edit
                                                            </button>
                                                            <button onClick={() => handleDelete(update.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2">
                                                                <Trash size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {isEditing ? (
                                            <div className="mt-2">
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg p-2 text-neutral-900 dark:text-white text-sm resize-none outline-none"
                                                    rows={2}
                                                    maxLength={140}
                                                />
                                                <div className="flex gap-2 mt-1 justify-end">
                                                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
                                                    <button onClick={() => handleEditSubmit(update.id)} className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-1 text-neutral-900 dark:text-white whitespace-pre-wrap break-words">
                                                {update.content}
                                            </p>
                                        )}

                                        {update.image_url && !isEditing && (
                                            <div className="mt-2">
                                                <img src={update.image_url} alt="Attached" className="max-h-96 rounded-xl border border-neutral-200 dark:border-neutral-800" />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-6 mt-3 text-neutral-500">
                                            <button onClick={() => handleToggleComments(update.id)} className={`flex items-center gap-1 transition-colors ${isCommentActive ? 'text-blue-500' : 'hover:text-blue-500'}`}>
                                                <ChatCircle size={18} /> <span className="text-sm">{update.comment_count > 0 ? update.comment_count : ''}</span>
                                            </button>
                                            <button onClick={() => handleRepost(update.id)} className={`flex items-center gap-1 transition-colors ${update.is_reposted ? 'text-green-500' : 'hover:text-green-500'}`}>
                                                <Repeat size={18} /> <span className="text-sm">{update.repost_count > 0 ? update.repost_count : ''}</span>
                                            </button>
                                            <button onClick={() => handleLike(update.id)} className={`flex items-center gap-1 transition-colors ${update.is_liked ? 'text-red-500' : 'hover:text-red-500'}`}>
                                                <Heart size={18} weight={update.is_liked ? "fill" : "regular"} /> <span className="text-sm">{update.like_count > 0 ? update.like_count : ''}</span>
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
                                                <div key={comment.id} className="mb-3 text-sm flex gap-2">
                                                    {commentAuthor.avatar ? (
                                                        <img src={commentAuthor.avatar} alt={commentAuthor.first_name} className="size-6 rounded-full object-cover mt-0.5 flex-shrink-0" />
                                                    ) : (
                                                        <div className="size-6 rounded-full flex items-center justify-center text-white text-xs font-medium mt-0.5 flex-shrink-0" style={{ backgroundColor: getColorFromName(commentAuthor.first_name) }}>
                                                            {commentAuthor.first_name[0]}{commentAuthor.last_name[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="font-semibold text-neutral-900 dark:text-white">{commentAuthor.first_name} {commentAuthor.last_name}</span>
                                                        <span className="text-neutral-500 ml-1 text-xs">· {formatTime(comment.created_at)}</span>
                                                        <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">{comment.content}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        <form onSubmit={(e) => handleSendComment(e, update.id)} className="flex items-center gap-2 mt-2">
                                            <input
                                                type="text"
                                                value={commentInput}
                                                onChange={(e) => setCommentInput(e.target.value)}
                                                placeholder="Write a reply..."
                                                className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 transition-all"
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={!commentInput.trim() || isSendingComment} 
                                                className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-full hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center min-w-[60px]"
                                            >
                                                {isSendingComment ? '...' : 'Reply'}
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
