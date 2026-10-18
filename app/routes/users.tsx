import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useChatContext } from '~/providers/ChatProvider';
import { ChatCircleDots, ArrowLeft, Heart, Repeat, PaperPlaneRight, UserPlus, UserCheck, DotsThree, Pencil, Trash } from "@phosphor-icons/react";
import type { User } from '~/types/chat';

type Update = {
    id: string;
    user_id: string;
    content: string;
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

export default function UserProfile() {
    const { handle } = useParams();
    const navigate = useNavigate();
    const { users, channels, addChannel } = useChatContext();

    const [updates, setUpdates] = useState<Update[]>([]);
    const [isLoadingUpdates, setIsLoadingUpdates] = useState(true);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    
    const [isFollowing, setIsFollowing] = useState(false);
    
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [commentInput, setCommentInput] = useState("");
    const [isSendingComment, setIsSendingComment] = useState(false);

    const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('session') || '' : '';

    const currentUser = useMemo(() => {
        if (!myUserId) return null;
        return users.find(u => u.id === myUserId) || null;
    }, [users, myUserId]);

    const username = handle?.startsWith('@') ? handle.slice(1) : handle;
    const user = useMemo(() => users.find(u => u.username === username), [users, username]);

    const fetchUpdates = async (userId: string) => {
        try {
            const res = await fetch(`https://readtalk.soeparnocorp.workers.dev/updates?userId=${userId}`, {
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

    useEffect(() => {
        if (!user || !currentUser) {
            setIsLoadingUpdates(false);
            return;
        }
        fetchUpdates(user.id);
    }, [user, currentUser, sessionId]);

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
            if(user) fetchUpdates(user.id);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus postingan ini?")) return;
        
        setUpdates(prev => prev.filter(u => u.id !== id));
        setActiveMenuId(null);

        try {
            await fetch(`https://readtalk.soeparnocorp.workers.dev/updates/${id}`, {
                method: 'DELETE',
                headers: { 'X-Session-Id': sessionId }
            });
        } catch (error) {
            console.error("Failed to delete update", error);
            if(user) fetchUpdates(user.id);
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
            user_id: myUserId || '',
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

    if (!currentUser) {
        return <div className="p-4 text-center text-neutral-500">?</div>;
    }

    if (!user) {
        return <div className="p-4">User not found</div>;
    }

    const fullName = `${user.first_name} ${user.last_name}`;
    const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    const isOnline = user.status === 'online';

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-950 overflow-y-auto" onClick={() => setActiveMenuId(null)}>
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
                        <div className="relative w-24 h-24">
                            {user.avatar ? (
                                <img src={user.avatar} alt={fullName} className="w-24 h-24 rounded-full object-cover border-4 border-neutral-200 dark:border-neutral-800" />
                            ) : (
                                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-neutral-200 dark:border-neutral-800" style={{ backgroundColor: getColorFromName(fullName) }}>
                                    {initials}
                                </div>
                            )}
                            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-white dark:border-neutral-950 ${isOnline ? 'bg-green-500' : 'bg-neutral-400'}`} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{fullName}</h2>
                            {user.username && <p className="text-neutral-500 mt-1">@{user.username}</p>}
                        </div>
                        {user.bio && <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">{user.bio}</p>}
                    </div>

                    {myUserId !== user.id && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsFollowing(!isFollowing)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                                    isFollowing 
                                    ? 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                                    : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent hover:bg-neutral-800 dark:hover:bg-neutral-100'
                                }`}
                            >
                                {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>

                            {isFollowing && (
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
                    )}
                </div>
            </div>

            <div className="flex-1">
                {isLoadingUpdates ? (
                    <div className="flex justify-center p-8 text-neutral-500">Loading updates...</div>
                ) : updates.length === 0 ? (
                    <div className="flex justify-center p-8 text-neutral-500">Belum ada update.</div>
                ) : (
                    updates.map((update) => {
                        const isCommentActive = activeCommentPostId === update.id;
                        const isMyPost = myUserId === update.user_id;
                        const isEditing = editingId === update.id;
                        const isMenuOpen = activeMenuId === update.id;

                        return (
                            <div key={update.id} className="flex flex-col p-4 border-b border-neutral-200 dark:border-neutral-800">
                                <div className="flex gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-neutral-900 dark:text-white">{fullName}</span>
                                                {user.username && <span className="text-sm text-neutral-500">@{user.username}</span>}
                                                <span className="text-sm text-neutral-500">· {new Date(update.created_at * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
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
                                            <p className="mt-1 text-neutral-900 dark:text-white whitespace-pre-wrap break-words">{update.content}</p>
                                        )}

                                        <div className="flex items-center gap-6 mt-3 text-neutral-500">
                                            <button onClick={() => handleToggleComments(update.id)} className={`flex items-center gap-1 transition-colors ${isCommentActive ? 'text-blue-500' : 'hover:text-blue-500'}`}>
                                                <ChatCircleDots size={18} /> <span className="text-sm">{update.comment_count > 0 ? update.comment_count : ''}</span>
                                            </button>
                                            <button onClick={() => handleRepost(update.id)} className={`flex items-center gap-1 transition-colors ${update.is_reposted ? 'text-green-500' : 'hover:text-green-500'}`}>
                                                <Repeat size={18} /> <span className="text-sm">{update.repost_count > 0 ? update.repost_count : ''}</span>
                                            </button>
                                            <button onClick={() => handleLike(update.id)} className={`flex items-center gap-1 transition-colors ${update.is_liked ? 'text-red-500' : 'hover:text-red-500'}`}>
                                                <Heart size={18} weight={update.is_liked ? "fill" : "regular"} /> <span className="text-sm">{update.like_count > 0 ? update.like_count : ''}</span>
                                            </button>
                                            <button className="flex items-center gap-1 hover:text-red-500 transition-colors"><PaperPlaneRight size={18} /></button>
                                        </div>
                                    </div>
                                </div>

                                {isCommentActive && (
                                    <div className="mt-3 ml-12 border-l-2 border-neutral-200 dark:border-neutral-800 pl-3">
                                        {comments[update.id]?.map((comment) => {
                                            const commentAuthor = users.find(u => u.id === comment.user_id);
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
                                                        <span className="text-neutral-500 ml-1 text-xs">· {new Date(comment.created_at * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
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
