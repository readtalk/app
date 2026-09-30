import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Moon, Sun, Plus, Lock, SignOut, User, ChatCircleDots, Camera, UsersThree, Phone, DotsThree } from "@phosphor-icons/react";
import { useChatContext } from "~/providers/ChatProvider";
import { useWebSocket } from "~/providers/WebSocketProvider";
import { useModal } from '~/providers/ModalProvider';
import { CreateChannelModal } from '~/components/modals/CreateChannelModal';

export default function AuthLayout() {
    const location = useLocation();
    const { channels, onlineUsers, offlineUsers, isLoadingChannels, users, updateUserStatus } = useChatContext();
    const { addMessageListener, removeMessageListener } = useWebSocket();
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'update' | 'communities' | 'call'>('chat');
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

    const NavBar = ({ showInitials = false }: { showInitials?: boolean }) => (
        <div className="flex w-full items-center justify-center gap-8 border-neutral-200 bg-neutral-50 py-2 transition-colors dark:border-neutral-800 dark:bg-neutral-950 relative md:flex-col md:gap-2 md:py-4 md:h-full md:justify-start md:pt-4">
            <button
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeTab === 'chat' ? 'bg-red-50 dark:bg-red-950' : ''}`}
            >
                <ChatCircleDots size={22} weight={activeTab === 'chat' ? 'fill' : 'regular'} className={activeTab === 'chat' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                <span className={`text-xs ${activeTab === 'chat' ? 'font-medium text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Chat</span>
            </button>
            <button
                onClick={() => setActiveTab('update')}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeTab === 'update' ? 'bg-red-50 dark:bg-red-950' : ''}`}
            >
                <Camera size={22} weight={activeTab === 'update' ? 'fill' : 'regular'} className={activeTab === 'update' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                <span className={`text-xs ${activeTab === 'update' ? 'font-medium text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Update</span>
            </button>
            <button
                onClick={() => setActiveTab('communities')}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeTab === 'communities' ? 'bg-red-50 dark:bg-red-950' : ''}`}
            >
                <UsersThree size={22} weight={activeTab === 'communities' ? 'fill' : 'regular'} className={activeTab === 'communities' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                <span className={`text-xs ${activeTab === 'communities' ? 'font-medium text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Communities</span>
            </button>
            <button
                onClick={() => setActiveTab('call')}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${activeTab === 'call' ? 'bg-red-50 dark:bg-red-950' : ''}`}
            >
                <Phone size={22} weight={activeTab === 'call' ? 'fill' : 'regular'} className={activeTab === 'call' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'} />
                <span className={`text-xs ${activeTab === 'call' ? 'font-medium text-red-500' : 'text-neutral-500 dark:text-neutral-400'}`}>Call</span>
            </button>

            {showInitials && (
                <div className="absolute right-4 size-8 font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded flex items-center justify-center text-sm md:static md:mt-auto md:mb-4">
                    {userInitials}
                </div>
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
                    w-full md:w-80 px-3 pt-6 border-r border-neutral-200 transition-colors dark:border-neutral-800
                `}>
                    <div className="px-2 mb-4 relative flex items-center justify-between">
                        <div><strong>READT</strong>alk</div>
                        <button
                            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                            className="p-1 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all"
                        >
                            <DotsThree size={20} weight="bold" />
                        </button>

                        {showThemeDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-50">
                                <div className="py-1">
                                    <Link
                                        to="/profile"
                                        className="flex items-center px-4 py-2 text-base w-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        onClick={() => setShowThemeDropdown(false)}
                                    >
                                        <User size={16} className="mr-2" />
                                        Profile
                                    </Link>

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
                                    <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
                                    <button
                                        onClick={handleSignOut}
                                        className="flex items-center px-4 py-2 text-base w-full text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                    >
                                        <SignOut size={16} className="mr-2" />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {activeTab === 'chat' && (
                        <>
                            <div className="px-2 mb-2 flex justify-between items-center">
                                <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                                    Channels
                                </h2>
                                <Plus 
                                    size={16} 
                                    className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
                                    onClick={() => {
                                        openModal(<CreateChannelModal onClose={closeModal} />);
                                    }}
                                />
                            </div>
                            {isLoadingChannels ? (
                                <div className="px-2 py-1.5 text-base text-neutral-500">Loading channels...</div>
                            ) : (
                                channels.map((channel) => (
                                    <Link
                                        key={channel.id}
                                        to={`/channel/${channel.id}`}
                                        className="flex items-center px-2 py-1.5 text-base text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded cursor-pointer"
                                    >
                                        <div className="flex items-center flex-1">
                                            {channel.is_private ? (
                                                <Lock size={14} className="mr-2" />
                                            ) : (
                                                <span className="mr-2">#</span>
                                            )}
                                            <span className={unreadChannels.has(channel.id) ? 'font-bold' : ''}>
                                                {channel.name}
                                            </span>
                                        </div>
                                    </Link>
                                ))
                            )}
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
