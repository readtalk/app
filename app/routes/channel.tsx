import { useParams, useNavigate } from 'react-router-dom';
import { Hash, Lock, ArrowDown, DotsThree, ArrowLeft } from "@phosphor-icons/react";
import { useChatContext } from "~/providers/ChatProvider";
import { useWebSocket } from "~/providers/WebSocketProvider";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Message, User } from '~/types/chat';
import { useModal } from '~/providers/ModalProvider';
import { InviteUsersModal } from '~/components/modals/InviteUsersModal';
import { ChatInput } from '~/components/ChatInput';

export default function Channel() {
    const { id } = useParams();
    const { channels, users, onlineUsers } = useChatContext();
    const { addMessageListener, removeMessageListener, isConnected, reconnect } = useWebSocket();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [hasMoreLocal, setHasMoreLocal] = useState(true);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);
    const isLoadingMoreRef = useRef(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { openModal, closeModal } = useModal();
    const navigate = useNavigate();

    const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

    const userMap = useMemo(() => {
        return users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {} as Record<string, User>);
    }, [users]);

    const getUserInitials = (userId: string) => {
        const user = userMap[userId];
        if (user) {
            return (user.first_name[0] + user.last_name[0]).toUpperCase();
        }
        return userId.slice(0, 2).toUpperCase();
    };

    const getColorFromName = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 70%, 50%)`;
    };

    const getContrastColor = (hsl: string) => {
        const lightness = parseInt(hsl.split(',')[2].replace('%)', ''));
        return lightness > 65 ? '#000000' : '#ffffff';
    };

    const parseAssets = (assets: any): string[] => {
        try {
            if (!assets) return [];
            if (Array.isArray(assets)) return assets;
            const parsed = JSON.parse(assets);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const isSameDay = (a: number, b: number) => {
        const da = new Date(a * 1000);
        const db = new Date(b * 1000);
        return da.getFullYear() === db.getFullYear()
            && da.getMonth() === db.getMonth()
            && da.getDate() === db.getDate();
    };

    const formatDay = (timestamp: number) => {
        const d = new Date(timestamp * 1000);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Hari ini';
        if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';

        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const currentChannel = channels.find(channel => channel.id.toString() === id);

    const scrollToBottom = () => {
        messageContainerRef.current?.scrollTo({
            top: messageContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    };

    const handleScroll = useCallback(() => {
        const container = messageContainerRef.current;
        if (!container) return;

        const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        isNearBottomRef.current = isNear;
        setShowScrollButton(!isNear);

        if (
            container.scrollTop <= 50 &&
            hasMoreLocal &&
            !isLoadingMessages &&
            !isLoadingMoreRef.current &&
            localMessages.length > 0 &&
            currentChannel
        ) {
            isLoadingMoreRef.current = true;
            const scrollHeight = container.scrollHeight;

            const earliestMessage = localMessages.reduce((earliest, current) =>
                current.created_at < earliest.created_at ? current : earliest
            );

            fetch(`https://readtalk.soeparnocorp.workers.dev/channel/messages?before=${earliestMessage.id}`, {
                headers: {
                    'X-Session-Id': localStorage.getItem('session') || '',
                    'X-Channel-Id': currentChannel.id
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.messages.length > 0) {
                    setLocalMessages(prev =>
                        [...prev, ...data.messages].sort((a, b) => a.created_at - b.created_at)
                    );
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const newScrollHeight = container.scrollHeight;
                            container.scrollTop = newScrollHeight - scrollHeight;
                        });
                    });
                } else {
                    setHasMoreLocal(false);
                }
            })
            .catch(error => console.error('Error loading more messages:', error))
            .finally(() => {
                isLoadingMoreRef.current = false;
            });
        }
    }, [hasMoreLocal, isLoadingMessages, localMessages, currentChannel?.id]);

    useEffect(() => {
        if (id) {
            addMessageListener(id, (message) => {
                setLocalMessages(prev => [...prev, message]);

                const audio = new Audio('/notification/all-eyes-on-me-465.mp3');
                audio.play().catch(() => {});
                navigator.vibrate?.([200, 100, 200]);

                if (isNearBottomRef.current) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const container = messageContainerRef.current;
                            if (container) {
                                container.scrollTop = container.scrollHeight;
                                isNearBottomRef.current = true;
                                setShowScrollButton(false);
                            }
                        });
                    });
                }
            });
            return () => {
                removeMessageListener(id);
            };
        }
    }, [id]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!currentChannel) return;
            setIsLoadingMessages(true);
            setHasMoreLocal(true);
            isLoadingMoreRef.current = false;
            try {
                const response = await fetch('https://readtalk.soeparnocorp.workers.dev/channel/messages', {
                    headers: {
                        'X-Session-Id': localStorage.getItem('session') || '',
                        'X-Channel-Id': currentChannel.id
                    }
                });

                const data = await response.json();
                if (data.success) {
                    setLocalMessages(data.messages.reverse());
                    setTimeout(() => {
                        messageContainerRef.current?.scrollTo({
                            top: messageContainerRef.current.scrollHeight,
                            behavior: 'instant'
                        });
                        isNearBottomRef.current = true;
                        setShowScrollButton(false);
                    }, 10);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            } finally {
                setIsLoadingMessages(false);
            }
        };

        fetchMessages();
    }, [currentChannel?.id]);

    useEffect(() => {
        const handleFocus = async () => {
            if (!isConnected()) {
                reconnect();
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [id, isConnected, reconnect]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInviteUsers = () => {
        if (!currentChannel) return;
        openModal(<InviteUsersModal onClose={closeModal} channel={currentChannel} />);
        setShowDropdown(false);
    };

    const handleLeaveChannel = async () => {
        try {
            const response = await fetch(`https://readtalk.soeparnocorp.workers.dev/channels/${currentChannel?.id}/leave`, {
                method: 'POST',
                headers: {
                    'X-Session-Id': localStorage.getItem('session') || '',
                }
            });
            if (!response.ok) {
                throw new Error('Failed to leave channel');
            }
            navigate('/channel/0');
            setShowDropdown(false);
        } catch (error) {
            console.error('Error leaving channel:', error);
        }
    };

    if (!currentChannel) {
        return <div className="p-4">Channel not found</div>;
    }

    const handleSubmit = async (e: React.FormEvent, assets: string[]) => {
        e.preventDefault();
        if (!message.trim() || isSending) return;

        setIsSending(true);
        try {
            const response = await fetch('https://readtalk.soeparnocorp.workers.dev/channel/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Channel-Id': currentChannel.id,
                    'X-Session-Id': localStorage.getItem('session') || '',
                },
                body: JSON.stringify({
                    content: message,
                    assets: assets
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            if (data.success && data.message) {
                const audio = new Audio('/notification/all-eyes-on-me-465.mp3');
                audio.play().catch(() => {});

                if (isNearBottomRef.current) {
                    requestAnimationFrame(() => {
                        messageContainerRef.current?.scrollTo({
                            top: messageContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    });
                }
            }
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800">
                <button
                    onClick={() => navigate('/channel/0')}
                    className="md:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                >
                    <ArrowLeft size={20} weight="bold" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-semibold flex items-center gap-2">
                        {currentChannel.is_private ? (
                            <Lock className="w-5 h-5 text-gray-500" />
                        ) : (
                            <Hash className="w-5 h-5 text-gray-500" />
                        )}
                        {currentChannel.name}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {currentChannel.description || "No description available"}
                    </p>
                </div>
                <div className="flex -space-x-2">
                    {users
                        .filter(user => currentChannel.member_ids.includes(user.id))
                        .map(user => (
                            <div key={user.id} className="relative" title={`${user.first_name} ${user.last_name}`}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-blue-500 text-white"
                                    style={{
                                        backgroundColor: getColorFromName(`${user.first_name} ${user.last_name}`),
                                        color: getContrastColor(getColorFromName(`${user.first_name} ${user.last_name}`))
                                    }}
                                >
                                    {getUserInitials(user.id)}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
                                    ${onlineUsers.some(u => u.id === user.id) ? 'bg-green-500' : 'bg-gray-400'}`}
                                />
                            </div>
                        ))}
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                    >
                        <DotsThree weight="bold" className="w-6 h-6" />
                    </button>
                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-md shadow-lg z-10 py-1">
                            <button
                                onClick={handleInviteUsers}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            >
                                Invite
                            </button>
                            <button
                                onClick={handleLeaveChannel}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            >
                                Leave
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-0 relative">
                <div
                    ref={messageContainerRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto p-4"
                >
                    {isLoadingMessages ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {localMessages.map((msg, index) => {
                                const user = userMap[msg.user_id];
                                const displayName = user
                                    ? `${user.first_name} ${user.last_name}`
                                    : msg.user_id.split('-')[0];
                                const assets = parseAssets(msg.assets);
                                const isMe = msg.user_id === myUserId;
                                const prev = localMessages[index - 1];
                                const isNewDay = !prev || !isSameDay(prev.created_at, msg.created_at);
                                const isGrouped = prev
                                    && prev.user_id === msg.user_id
                                    && isSameDay(prev.created_at, msg.created_at);

                                return (
                                    <div key={msg.id}>
                                        {isNewDay && (
                                            <div className="flex justify-center my-4">
                                                <span className="px-3 py-1 text-xs rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                                    {formatDay(msg.created_at)}
                                                </span>
                                            </div>
                                        )}

                                        <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
                                            <div className="w-8 flex-shrink-0">
                                                {!isGrouped && !isMe && (
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                                                        style={{
                                                            backgroundColor: getColorFromName(displayName),
                                                            color: getContrastColor(getColorFromName(displayName))
                                                        }}
                                                    >
                                                        {getUserInitials(msg.user_id)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                                {!isGrouped && !isMe && (
                                                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-0.5 ml-1">
                                                        {displayName}
                                                    </span>
                                                )}

                                                <div className={`px-3 py-2 rounded-2xl ${
                                                    isMe
                                                        ? 'bg-blue-500 text-white rounded-br-sm'
                                                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'
                                                }`}>
                                                    {msg.content && (
                                                        <p className="text-sm whitespace-pre-wrap break-words">
                                                            {msg.content}
                                                        </p>
                                                    )}
                                                    {assets.length > 0 && (
                                                        <div className={`flex flex-wrap gap-2 ${msg.content ? 'mt-2' : ''}`}>
                                                            {assets.map((url, i) => (
                                                                <img
                                                                    key={i}
                                                                    src={url}
                                                                    alt="Uploaded content"
                                                                    className="max-w-[240px] max-h-[240px] rounded-lg"
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-neutral-500 dark:text-neutral-400'} text-right`}>
                                                        {formatTime(msg.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {showScrollButton && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-600 flex items-center gap-2"
                    >
                        <ArrowDown weight="bold" className="w-4 h-4" />
                        Scroll to latest
                    </button>
                )}
            </div>

            <ChatInput
                message={message}
                onChange={setMessage}
                onSubmit={handleSubmit}
                isSending={isSending}
                channelId={currentChannel.id}
                sessionId={localStorage.getItem('session') || ''}
            />
        </div>
    );
}
