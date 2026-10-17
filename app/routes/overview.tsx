import { useState, useEffect, useRef } from "react";
import { useChatContext } from "~/providers/ChatProvider";
import { useModal } from "~/providers/ModalProvider";
import { UserOverviewModal } from "~/components/modals/UserOverviewModal";
import { ChatCircle, Heart, Repeat, PaperPlaneRight } from "@phosphor-icons/react";

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
    const { users } = useChatContext();
    const { openModal, closeModal } = useModal();
    const [updates, setUpdates] = useState<Update[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [content, setContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sessionId = localStorage.getItem('session') || '';

    const userMap = (users || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {} as Record<string, any>);

    const fetchUpdates = async () => {
        try {
            const res = await fetch('https://readtalk.soeparnocorp.workers.dev/updates');
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
                body: JSON.stringify({ content })
            });
            const data = await res.json();
            if (data.success) {
                setUpdates([data.update, ...updates]);
                setContent("");
            }
        } catch (error) {
            console.error("Failed to post update", error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleUserClick = (userId: string) => {
        openModal(<UserOverviewModal onClose={closeModal} userId={userId} />);
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-950 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 p-4">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Home</h1>
            </div>

            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's happening?"
                            className="w-full bg-transparent text-lg text-neutral-900 dark:text-white resize-none outline-none placeholder:text-neutral-500"
                            rows={3}
                            maxLength={140}
                        />
                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                            <span className={`text-sm ${content.length > 140 ? 'text-red-500' : 'text-neutral-400'}`}>
                                {content.length}/140
                            </span>
                            <button
                                onClick={handlePost}
                                disabled={!content.trim() || isPosting || content.length > 140}
                                className="px-4 py-1.5 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isPosting ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                {isLoading ? (
                    <div className="flex justify-center p-8 text-neutral-500">Loading...</div>
                ) : updates.length === 0 ? (
                    <div className="flex justify-center p-8 text-neutral-500">No updates yet.</div>
                ) : (
                    updates.map((update) => {
                        const author = userMap[update.user_id];
                        if (!author) return null;

                        const fullName = `${author.first_name || ''} ${author.last_name || ''}`;
                        const initials = `${author.first_name?.[0] || ''}${author.last_name?.[0] || ''}`.toUpperCase();

                        return (
                            <div key={update.id} className="flex gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <button onClick={() => handleUserClick(author.id)} className="flex-shrink-0">
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
                                        <button onClick={() => handleUserClick(author.id)} className="font-bold text-neutral-900 dark:text-white hover:underline">
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
