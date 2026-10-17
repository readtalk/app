import { useState, useEffect } from "react";
import { useChatContext } from "~/providers/ChatProvider";
import { useModal } from "~/providers/ModalProvider";
import { UserOverviewModal } from "~/components/modals/UserOverviewModal";
import { ChatCircle, Heart, Repeat, PaperPlaneRight } from "@phosphor-icons/react";

type Update = {
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
    const { users } = useChatContext();
    const { openModal, closeModal } = useModal();
    const [updates, setUpdates] = useState<Update[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const userMap = (users || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {} as Record<string, any>);

    useEffect(() => {
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
        fetchUpdates();
    }, []);

    const handleUserClick = (userId: string) => {
        openModal(<UserOverviewModal onClose={closeModal} userId={userId} />);
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return <div className="p-4 text-center text-neutral-500">Loading updates...</div>;
    }

    return (
        <div className="p-4">
            {updates.length === 0 ? (
                <div className="text-center text-neutral-500">Belum ada update.</div>
            ) : (
                updates.map((update) => {
                    const author = userMap[update.user_id];
                    if (!author) return null;

                    const fullName = `${author.first_name || ''} ${author.last_name || ''}`;
                    const initials = `${author.first_name?.[0] || ''}${author.last_name?.[0] || ''}`.toUpperCase();

                    return (
                        <div key={update.id} className="flex gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800">
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
    );
}
