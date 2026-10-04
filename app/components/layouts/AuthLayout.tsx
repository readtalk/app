import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Moon, Sun, Plus, Lock, SignOut, User, ChatCircleDots, Camera, UsersThree, Phone, DotsThree, Gear, ArrowLeft, UserCircle, Bell, Palette, Globe, Question, ShareNetwork } from "@phosphor-icons/react";
import { useChatContext } from "~/providers/ChatProvider";
import { useWebSocket } from "~/providers/WebSocketProvider";
import { useModal } from '~/providers/ModalProvider';
import { CreateChannelModal } from '~/components/modals/CreateChannelModal';
import { ProfileModal } from '~/components/modals/ProfileModal';

export default function AuthLayout() {
    const location = useLocation();
    const { channels, onlineUsers, offlineUsers, isLoadingChannels, users, updateUserStatus } = useChatContext();
    const { addMessageListener, removeMessageListener } = useWebSocket();
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'update' | 'communities' | 'call' | 'settings'>('chat');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            return (savedTheme || 
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) as 'light' | 'dark';
        }
        return 'light';
    });
    const navigate = useNavigate();
    const { openModal, closeModal } = useModal();
    const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());

    const userInitials = useMemo(() => {
        if (typeof window === 'undefined') return '';

        const userId = localStorage.getItem('userId');
        const currentUser = users.find(user => user.id === userId);
        if (currentUser) {
            return `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase();
        }
        return '?';
    }, [users]);

    const currentUser = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const userId = localStorage.getItem('userId');
        return users.find(user => user.id === userId) || null;
    }, [users]);

    const privateChannels = channels.filter(c => c.is_private);
    const groupChannels = channels.filter(c => !c.is_private);

    const getChannelColor = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 70%, 50%)`;
    };

    const getChannelInitials = (name: string) => {
        return name.slice(0, 2).toUpperCase();
    };

    const renderUserAvatar = (size: string) => {
        if (currentUser?.avatar) {
            return (
                <img
                    src={currentUser.avatar}
                    alt={userInitials}
                    className={`${size} rounded-full flex-shrink-0 object-cover`}
                />
            );
        }
        return (
            <div
                className={`${size} rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium`}
                style={{
                    backgroundColor: currentUser
                        ? getChannelColor(`${currentUser.first_name} ${currentUser.last_name}`)
                        : '#888'
                }}
            >
                {userInitials}
            </div>
        );
    };

    useEffect(() => {
        const handleUserStatus = (message: any) => {
            if (message.type === 'USER_CONNECTED' || message.type === 'USER_DISCONNECTED') {
                updateUserStatus(
                    message.userId, 
                    message.type === 'USER_CONNECTED' ? 'online' : 'offline'
                );
            }
        };

        const handleNewMessage = (message: any) => {
            console.log('New message received:', message);
            if (message.type === 'NEW_MESSAGE') {
                const currentChannelId = location.pathname.split('/').pop();
                if (message.channelId !== currentChannelId) {
                    setUnreadChannels(prev => {
                        const next = new Set(prev);
                        next.add(message.channelId);
                        return next;
                    });
                }
            }
        };

        addMessageListener('NEW_MESSAGE', handleNewMessage);
        addMessageListener('USER_STATUS', handleUserStatus);

        return () => {
            removeMessageListener('NEW_MESSAGE');
            removeMessageListener('USER_STATUS');
        };
    }, [addMessageListener, removeMessageListener, updateUserStatus, location.pathname]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');

        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', theme);
        }

        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
        }
    }, [theme]);

    useEffect(() => {
        const channelId = location.pathname.split('/').pop();
        if (channelId) {
            setUnreadChannels(prev => {
                const next = new Set(prev);
                next.delete(channelId);
                return next;
            });
        }
    }, [location.pathname]);

    const toggleTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        setShowThemeDropdown(false);
    };

    const handleShare = async () => {
        if (!currentUser?.username) return;
        const url = `https://app.readtalk.workers.dev/@${currentUser.username}`;
        if (navigator.share) {
            try {
                await navigator.share({ url });
            } catch {
                // user cancelled
            }
        } else {
            await navigator.clipboard.writeText(url);
        }
        setShowThemeDropdown(false);
    };

    const handleSignOut = async () => {
        try {
            const sessionId = localStorage.getItem('session');
            await fetch('https://readtalk.soeparnocorp.workers.dev/logout', {
                method: 'POST',
                headers: {
                    'X-Session-Id': sessionId || ''
                }
            });

            localStorage.removeItem('session');
            localStorage.removeItem('userId');
            localStorage.removeItem('user');

            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');

            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', '#ffffff');
            }

            const metaBgColor = document.querySelector('meta[name="background-color"]');
            if (metaBgColor) {
                metaBgColor.setAttribute('content', '#ffffff');
            }

            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
        setShowThemeDropdown(false);
    };

    const isChatPage = location.pathname.startsWith('/channel/') && location.pathname !== '/channel/0';

    const tabTitle = {
        chat: 'READTalk',
        update: 'Update',
        communities: 'Communities',
        call: 'Call',
        settings: 'Settings',
    }[activeTab];

    const NavBar = ({ showInitials = false }: { showInitials?: boolean }) => (
        <div className="flex w-full items-center justify-center gap-8 border-neutral-200 bg-neutral-50 py-2 transition-colors dark:border-neutral-800 dark:bg-neutral-950 relative md:flex-col md:gap-2 md:py-4 md:h-full md:justify-start md:pt-4">
            <button
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeTab === 'chat' ? 'bg-red-50 dark:bg-red-950' : ''}`}
            >
                <ChatCircleDots size={28} weight={activeTab === 'chat' ? 'fill' : 'regular'} className={activeTab === 'chat' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                <span className={`text-xs md:hidden ${activeTab === 'chat' ? 'font-medium text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Chat</span>
            </button>
            <button
                onClick={() => setActiveTab('update')}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeTab === 'update' ? 'bg-red-50 dark:bg-red-950' : ''}`}
            >
                <Camera size={28} weight={activeTab === 'update' ? 'fill' : 'regular'} className={activeTab === 'update' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                <span className={`text-xs md:hidden ${activeTab === 'update' ? 'font-medium text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Update</span>
            </button>
            <button
                onClick={() => setActiveTab('communities')}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeTab === 'communities' ? 'bg-red-50 dark:bg-red-950' : ''}`}
            >
                <UsersThree size={28} weight={activeTab === 'communities' ? 'fill' : 'regular'} className={activeTab === 'communities' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                <span className={`text-xs md:hidden ${activeTab === 'communities' ? 'font-medium text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Communities</span>
            </button>
            <button
                onClick={() => setActiveTab('call')}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeTab === 'call' ? 'bg-red-50 dark:bg-red-950' : ''}`}
            >
                <Phone size={28} weight={activeTab === 'call' ? 'fill' : 'regular'} className={activeTab === 'call' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                <span className={`text-xs md:hidden ${activeTab === 'call' ? 'font-medium text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Call</span>
            </button>

            {showInitials && (
                <>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`hidden md:flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg mt-auto ${activeTab === 'settings' ? 'bg-red-50 dark:bg-red-950' : ''}`}
                    >
                        <Gear size={28} weight={activeTab === 'settings' ? 'fill' : 'regular'} className={activeTab === 'settings' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                    </button>
                    <div className="absolute right-4 md:static md:mb-4">
                        {currentUser?.avatar ? (
                            <img
                                src={currentUser.avatar}
                                alt={userInitials}
                                className="size-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
                            />
                        ) : (
                            <div className="size-8 font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded flex items-center justify-center text-sm">
                                {userInitials}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-screen">
            <div className="border-b border-neutral-200 dark:border-neutral-800 md:hidden" />

            <div className="flex flex-1 overflow-hidden">
                <div className="hidden md:flex md:w-16 md:border-r md:border-neutral-200 md:dark:border-neutral-800">
                    <NavBar showInitials={true} />
                </div>

                <div className={`
                    ${isChatPage ? 'hidden md:block' : 'block'} 
                    w-full md:w-96 px-3 pt-6 border-r border-neutral-200 transition-colors dark:border-neutral-800
                `}>
                    <div className="px-2 mb-4 relative flex items-center justify-between">
                        <div className="text-2xl">
                            {activeTab === 'chat' ? (
                                <span className="text-[#FF0000]"><strong>READT</strong>alk</span>
                            ) : (
                                <span className="font-semibold">{tabTitle}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {activeTab === 'chat' && (
                                <button
                                    onClick={() => {
                                        openModal(<CreateChannelModal onClose={closeModal} />);
                                    }}
                                    className="hidden md:flex p-1 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all"
                                >
                                    <Plus size={20} weight="bold" />
                                </button>
                            )}
                            {activeTab === 'settings' ? (
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    className="p-1 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all"
                                >
                                    <ArrowLeft size={20} weight="bold" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                                    className="p-1 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all"
                                >
                                    <DotsThree size={20} weight="bold" />
                                </button>
                            )}
                        </div>

                        {showThemeDropdown && activeTab !== 'settings' && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setActiveTab('settings');
                                            setShowThemeDropdown(false);
                                        }}
                                        className="flex md:hidden items-center px-4 py-2 text-base w-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                        <Gear size={16} className="mr-2" />
                                        Settings
                                    </button>

                                    <div className="md:hidden h-px bg-neutral-200 dark:bg-neutral-700 my-1" />

                                    <button
                                        onClick={handleShare}
                                        className="flex items-center px-4 py-2 text-base w-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                        <ShareNetwork size={16} className="mr-2" />
                                        Share
                                    </button>

                                    <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />

                                    <button
                                        onClick={() => toggleTheme('light')}
                                        className="flex items-center px-4 py-2 text-base w-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                        <Sun size={16} className="mr-2" />
                                        Light
                                    </button>
                                    <button
                                        onClick={() => toggleTheme('dark')}
                                        className="flex items-center px-4 py-2 text-base w-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                        <Moon size={16} className="mr-2" />
                                        Dark
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {activeTab === 'chat' && (
                        <>
                            <div className="px-2 mb-2">
                                <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                                    Channels
                                </h2>
                            </div>
                            {isLoadingChannels ? (
                                <div className="px-2 py-1.5 text-base text-neutral-500">Loading channels...</div>
                            ) : (
                                <>
                                    <div className="px-2 mt-2 mb-1">
                                        <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase">
                                            Private
                                        </h3>
                                    </div>
                                    {privateChannels.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-neutral-400 dark:text-neutral-500">
                                            Not found
                                        </div>
                                    ) : (
                                        privateChannels.map((channel) => {
                                            const color = getChannelColor(channel.name);
                                            return (
                                                <Link
                                                    key={channel.id}
                                                    to={`/channel/${channel.id}`}
                                                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                                                >
                                                    <div
                                                        className="size-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium"
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {getChannelInitials(channel.name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`truncate ${unreadChannels.has(channel.id) ? 'font-bold' : 'font-medium'} text-neutral-900 dark:text-neutral-100`}>
                                                            {channel.name}
                                                        </div>
                                                        <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                                            {channel.description || 'Private chat'}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })
                                    )}

                                    <div className="px-2 mt-4 mb-1">
                                        <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase">
                                            Group
                                        </h3>
                                    </div>
                                    {groupChannels.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-neutral-400 dark:text-neutral-500">
                                            Not found
                                        </div>
                                    ) : (
                                        groupChannels.map((channel) => {
                                            const color = getChannelColor(channel.name);
                                            return (
                                                <Link
                                                    key={channel.id}
                                                    to={`/channel/${channel.id}`}
                                                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                                                >
                                                    <div
                                                        className="size-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium"
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {getChannelInitials(channel.name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`truncate ${unreadChannels.has(channel.id) ? 'font-bold' : 'font-medium'} text-neutral-900 dark:text-neutral-100`}>
                                                            {channel.name}
                                                        </div>
                                                        <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                                            {channel.description || 'Group chat'}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })
                                    )}
                                </>
                            )}

                            <button
                                onClick={() => {
                                    openModal(<CreateChannelModal onClose={closeModal} />);
                                }}
                                className="md:hidden fixed bottom-24 right-6 size-14 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center hover:bg-red-600 z-40"
                            >
                                <Plus size={24} weight="bold" />
                            </button>
                        </>
                    )}

                    {activeTab === 'update' && (
                        <>
                            <div className="px-2 mb-2 flex justify-between items-center">
                                <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                                    Users
                                </h2>
                                <Plus 
                                    size={16} 
                                    className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer" 
                                />
                            </div>
                            {onlineUsers.map((user) => (
                                <div 
                                    key={user.id}
                                    className="flex items-center px-2 py-1.5 text-base text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded cursor-pointer"
                                >
                                    <span className="mr-2 size-2 rounded-full bg-green-500"></span>
                                    {user.first_name} {user.last_name}
                                </div>
                            ))}
                            {offlineUsers.map((user) => (
                                <div 
                                    key={user.id}
                                    className="flex items-center px-2 py-1.5 text-base text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded cursor-pointer opacity-60"
                                >
                                    <span className="mr-2 size-2 rounded-full bg-neutral-400"></span>
                                    {user.first_name} {user.last_name}
                                </div>
                            ))}
                        </>
                    )}

                    {activeTab === 'communities' && (
                        <div className="px-2 py-1.5 text-base text-neutral-500">
                            Communities coming soon
                        </div>
                    )}

                    {activeTab === 'call' && (
                        <div className="px-2 py-1.5 text-base text-neutral-500">
                            Call coming soon
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <>
                            <button
                                onClick={() => openModal(<ProfileModal onClose={closeModal} />)}
                                className="w-full flex items-center gap-4 px-2 py-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                            >
                                {renderUserAvatar("size-14")}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                                        {currentUser
                                            ? `${currentUser.first_name} ${currentUser.last_name}`
                                            : 'User'}
                                    </div>
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                        {currentUser?.email || ''}
                                    </div>
                                </div>
                            </button>

                            <div className="mt-4 space-y-1">
                                <button
                                    onClick={() => openModal(<ProfileModal onClose={closeModal} />)}
                                    className="w-full flex items-center gap-4 px-2 py-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                                >
                                    <UserCircle size={24} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100">Profile</div>
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">Name, profile picture, username</div>
                                    </div>
                                </button>

                                <button className="w-full flex items-center gap-4 px-2 py-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer">
                                    <Bell size={24} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100">Notifications</div>
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">Message, group & call tones</div>
                                    </div>
                                </button>

                                <button className="w-full flex items-center gap-4 px-2 py-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer">
                                    <Palette size={24} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100">Appearance</div>
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">Theme, wallpaper, chat settings</div>
                                    </div>
                                </button>

                                <button className="w-full flex items-center gap-4 px-2 py-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer">
                                    <Globe size={24} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100">App language</div>
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">English</div>
                                    </div>
                                </button>

                                <button className="w-full flex items-center gap-4 px-2 py-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer">
                                    <Question size={24} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100">Help and feedback</div>
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400">Help centre, contact us, privacy policy</div>
                                    </div>
                                </button>

                                <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-2" />

                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-4 px-2 py-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                                >
                                    <SignOut size={24} className="text-red-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="font-medium text-red-500">Sign out</div>
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </div>

            <div className={`border-t border-neutral-200 dark:border-neutral-800 ${isChatPage ? 'hidden' : 'md:hidden'}`}>
                <NavBar showInitials={false} />
            </div>
        </div>
    );
}
