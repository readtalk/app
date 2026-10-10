import { createContext, useContext, useState, useEffect } from 'react'
import type { Channel, User, Message } from '~/types/chat'
import { useWebSocket } from './WebSocketProvider'

type ChatContextType = {
  channels: Channel[]
  users: User[]
  onlineUsers: User[]
  offlineUsers: User[]
  addChannel: (channel: Channel) => void
  removeChannel: (channelId: string) => void
  updateChannel: (channel: Channel) => void
  updateUserStatus: (userId: string, status: 'online' | 'offline') => void
  isLoadingChannels: boolean
  messages: Message[]
  loadChannelMessages: (channelId: string, before?: string) => Promise<void>
  hasMoreMessages: boolean
  isLoadingMessages: boolean
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { updateUserStatus: wsUpdateUserStatus, addChannelListener, removeChannelListener } = useWebSocket();
  const [channels, setChannels] = useState<Channel[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingChannels, setIsLoadingChannels] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch('https://readtalk.soeparnocorp.workers.dev/channels', {
          headers: {
            'X-Session-Id': localStorage.getItem('session') || ''
          }
        })

        const data = await response.json()

        if (data.success) {
          setChannels(data.channels)
        } else {
          console.error('Failed to fetch channels')
        }
      } catch (error) {
        console.error('Error fetching channels:', error)
      } finally {
        setIsLoadingChannels(false)
      }
    }

    fetchChannels()
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersResponse = await fetch('https://readtalk.soeparnocorp.workers.dev/users', {
          headers: {
            'X-Session-Id': localStorage.getItem('session') || '',
          }
        });

        const usersData = await usersResponse.json();

        if (!usersData.success) {
          console.error('Failed to fetch users');
          return;
        }

        const onlineResponse = await fetch('https://readtalk.soeparnocorp.workers.dev/users/online', {
          headers: {
            'X-Session-Id': localStorage.getItem('session') || '',
          }
        });

        const onlineData = await onlineResponse.json();

        if (!onlineData.success) {
          console.error('Failed to fetch online users');
          return;
        }

        const onlineUserIds = new Set(onlineData.onlineUsers.map((user: User) => user.id));

        const usersWithStatus = usersData.users.map((user: User) => ({
          ...user,
          status: onlineUserIds.has(user.id) ? 'online' as const : 'offline' as const
        }));

        setUsers(usersWithStatus);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const handleChannelEvent = (event: { type: string; channel?: Channel; channelId?: string }) => {
      if (event.type === 'NEW_CHANNEL' && event.channel) {
        setChannels(prev => {
          if (prev.some(c => c.id === event.channel!.id)) return prev;
          return [...prev, event.channel!];
        });
      }

      if (event.type === 'CHANNEL_UPDATED' && event.channel) {
        setChannels(prev =>
          prev.map(c => c.id === event.channel!.id ? event.channel! : c)
        );
      }

      if (event.type === 'CHANNEL_LEFT' && event.channelId) {
        setChannels(prev => prev.filter(c => c.id !== event.channelId));
      }
    };

    addChannelListener(handleChannelEvent);

    return () => {
      removeChannelListener(handleChannelEvent);
    };
  }, [addChannelListener, removeChannelListener]);

  const onlineUsers = users.filter(user => user.status === 'online')
  const offlineUsers = users.filter(user => user.status === 'offline')

  const addChannel = (channel: Channel) => {
    setChannels(prev => {
      if (prev.some(c => c.id === channel.id)) return prev;
      return [...prev, channel];
    })
  }

  const removeChannel = (channelId: string) => {
    setChannels(prev => prev.filter(channel => channel.id !== channelId))
  }

  const updateChannel = (channel: Channel) => {
    setChannels(prev =>
      prev.map(c => c.id === channel.id ? channel : c)
    )
  }

  const updateUserStatus = (userId: string, status: 'online' | 'offline') => {
    setUsers(prev =>
      prev.map(user =>
        user.id === userId ? { ...user, status } : user
      )
    );
    wsUpdateUserStatus(userId, status);
  }

  const loadChannelMessages = async (channelId: string, before?: string) => {
    try {
      setIsLoadingMessages(true);
      const url = new URL(`https://readtalk.soeparnocorp.workers.dev/channels/${channelId}/messages`);
      if (before) {
        url.searchParams.append('before', before);
      }

      const response = await fetch(url.toString(), {
        headers: {
            'X-Session-Id': localStorage.getItem('session') || '',
            'X-Channel-Id': channelId
        }
      });
      const data = await response.json();

      setMessages(prev => before ? [...prev, ...data.messages] : data.messages);
      setHasMoreMessages(data.hasMore);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        channels,
        users,
        onlineUsers,
        offlineUsers,
        addChannel,
        removeChannel,
        updateChannel,
        updateUserStatus,
        isLoadingChannels,
        messages,
        loadChannelMessages,
        hasMoreMessages,
        isLoadingMessages
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
