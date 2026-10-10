import { createContext, useContext, useState, useEffect } from 'react';
import type { Message, Channel } from '~/types/chat';

type ChannelEvent = { type: string; channel?: Channel; channelId?: string };

type WebSocketContextType = {
    addMessageListener: (channelId: string, callback: (message: Message) => void) => void;
    removeMessageListener: (channelId: string) => void;
    notifyNewMessage: (channelId: string, message: Message) => void;
    updateUserStatus: (userId: string, status: 'online' | 'offline') => void;
    isConnected: () => boolean;
    reconnect: () => void;
    addChannelListener: (callback: (event: ChannelEvent) => void) => void;
    removeChannelListener: (callback: (event: ChannelEvent) => void) => void;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [messageListeners] = useState<Record<string, ((message: any) => void)[]>>({});
    const [globalMessageListeners] = useState<((message: any) => void)[]>([]);
    const [channelListeners] = useState<((event: ChannelEvent) => void)[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);

    const isConnected = (): boolean => {
        return Boolean(ws && ws.readyState === WebSocket.OPEN);
    };

    const connect = () => {
        if (isConnected()) {
            console.log('WebSocket already connected, skipping reconnection');
            return;
        }

        if (ws) {
            ws.close();
        }

        const userId = localStorage.getItem('userId') || '';
        const sessionId = localStorage.getItem('session') || '';
        const newWs = new WebSocket(`wss://readtalk.soeparnocorp.workers.dev/ws?sessionId=${encodeURIComponent(sessionId)}`);

        newWs.onopen = () => {
            if (messageListeners['USER_STATUS']) {
                messageListeners['USER_STATUS'].forEach(callback =>
                    callback({ type: 'USER_CONNECTED', userId })
                );
            }
        };

        newWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);

            if (data.type === 'NEW_MESSAGE' && data.message) {
                notifyNewMessage(data.message.channel_id, data.message);
                globalMessageListeners.forEach(callback => callback(data));
            }

            if (data.type === 'USER_CONNECTED' || data.type === 'USER_DISCONNECTED') {
                if (messageListeners['USER_STATUS']) {
                    messageListeners['USER_STATUS'].forEach(callback => callback(data));
                }
            }

            if (data.type === 'NEW_CHANNEL' || data.type === 'CHANNEL_UPDATED' || data.type === 'CHANNEL_LEFT') {
                channelListeners.forEach(callback => callback({
                    type: data.type,
                    channel: data.channel,
                    channelId: data.channelId
                }));
            }
        };

        newWs.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        newWs.onclose = () => {
            console.log('WebSocket connection closed');
        };

        setWs(newWs);
    };

    useEffect(() => {
        if (!ws) {
            connect();
        }

        const handleFocus = () => {
            if (!isConnected()) {
                console.log('Reconnecting WebSocket on window focus...');
                connect();
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
            if (ws) {
                ws.close();
            }
        };
    }, [ws]);

    const reconnect = () => {
        console.log('Manually reconnecting WebSocket...');
        connect();
    };

    const addMessageListener = (channelId: string, callback: (message: any) => void) => {
        if (channelId === 'NEW_MESSAGE') {
            globalMessageListeners.push(callback);
        } else {
            if (!messageListeners[channelId]) {
                messageListeners[channelId] = [];
            }
            messageListeners[channelId].push(callback);
        }
    };

    const removeMessageListener = (channelId: string) => {
        if (channelId === 'NEW_MESSAGE') {
            globalMessageListeners.length = 0;
        } else {
            delete messageListeners[channelId];
        }
    };

    const notifyNewMessage = (channelId: string, message: Message) => {
        if (messageListeners[channelId]) {
            messageListeners[channelId].forEach(callback => callback(message));
        }
    };

    const updateUserStatus = (userId: string, status: 'online' | 'offline') => {
        if (isConnected()) {
            ws!.send(JSON.stringify({
                type: status === 'online' ? 'USER_CONNECTED' : 'USER_DISCONNECTED',
                userId
            }));
        }
    };

    const addChannelListener = (callback: (event: ChannelEvent) => void) => {
        channelListeners.push(callback);
    };

    const removeChannelListener = (callback: (event: ChannelEvent) => void) => {
        const index = channelListeners.indexOf(callback);
        if (index > -1) {
            channelListeners.splice(index, 1);
        }
    };

    return (
        <WebSocketContext.Provider value={{
            addMessageListener,
            removeMessageListener,
            notifyNewMessage,
            updateUserStatus,
            isConnected,
            reconnect,
            addChannelListener,
            removeChannelListener
        }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
