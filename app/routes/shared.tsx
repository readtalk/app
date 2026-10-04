import { useLoaderData, Link } from "react-router-dom";
import { FacebookLogo, InstagramLogo, TiktokLogo, XLogo, YoutubeLogo, LinkedinLogo } from "@phosphor-icons/react";
import type { Route } from "./+types/shared";

export async function loader({ params }: Route.LoaderArgs) {
    const handle = params.handle;

    if (!handle?.startsWith("@")) {
        throw new Response("Not Found", { status: 404 });
    }

    const username = handle.slice(1);

    const response = await fetch(`https://readtalk.soeparnocorp.workers.dev/users/${username}`);

    if (!response.ok) {
        throw new Response("Not Found", { status: 404 });
    }

    const data = await response.json();

    if (!data.success || !data.user) {
        throw new Response("Not Found", { status: 404 });
    }

    return { user: data.user };
}

export function meta({ data }: Route.MetaArgs) {
    if (!data?.user) {
        return [{ title: "READTalk" }];
    }

    const fullName = `${data.user.first_name} ${data.user.last_name}`;

    return [
        { title: `${fullName} (@${data.user.username}) - READTalk` },
        { name: "description", content: data.user.bio || `Lihat profile ${fullName} di READTalk` },
        { property: "og:title", content: `${fullName} (@${data.user.username})` },
        { property: "og:description", content: data.user.bio || `Lihat profile ${fullName} di READTalk` },
        { property: "og:image", content: data.user.avatar || "" },
        { property: "og:type", content: "profile" },
    ];
}

const BlueSkyLogo = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M5.76537 7.01986C8.00566 8.70223 10.4166 12.1083 12 14.7675C13.5834 12.1083 15.9943 8.70223 18.2346 7.01986C19.8513 5.80651 22 4.92272 22 7.01986C22 7.42966 21.7649 10.1962 21.6369 10.5148C20.7999 12.8826 18.3087 13.4825 16.0844 13.1204C19.7118 13.7371 20.6294 15.9136 18.5524 18.0901C14.6345 22.1923 12.9286 17.0172 12.5263 15.751C12.4526 15.5213 12.4184 15.4142 12 15.4142C11.5816 15.4142 11.5474 15.5213 11.4737 15.751C11.0714 17.0172 9.36553 22.1923 5.44756 18.0901C3.37062 15.9136 4.28817 13.7371 7.91557 13.1204C5.69131 13.4825 3.20007 12.8826 2.36312 10.5148C2.23512 10.1962 2 7.42966 2 7.01986C2 4.92272 4.14868 5.80651 5.76537 7.01986Z" />
    </svg>
);

const socialsMap: Record<string, { label: string; icon: any; url: (u: string) => string }> = {
    bluesky: { label: "BlueSky", icon: BlueSkyLogo, url: (u) => `https://bsky.app/profile/${u}` },
    facebook: { label: "Facebook", icon: FacebookLogo, url: (u) => `https://facebook.com/${u}` },
    instagram: { label: "Instagram", icon: InstagramLogo, url: (u) => `https://instagram.com/${u}` },
    tiktok: { label: "TikTok", icon: TiktokLogo, url: (u) => `https://tiktok.com/@${u}` },
    x: { label: "X", icon: XLogo, url: (u) => `https://x.com/${u}` },
    youtube: { label: "YouTube", icon: YoutubeLogo, url: (u) => `https://youtube.com/@${u}` },
    linkedin: { label: "LinkedIn", icon: LinkedinLogo, url: (u) => `https://linkedin.com/in/${u}` },
};

export default function Shared() {
    const { user } = useLoaderData<typeof loader>();
    const currentYear = new Date().getFullYear();

    const fullName = `${user.first_name} ${user.last_name}`;
    const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

    const getColorFromName = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 70%, 50%)`;
    };

    const activeSocials = user.socials
        ? Object.entries(user.socials).filter(([key, value]) => value && socialsMap[key])
        : [];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex-1 text-2xl">
                    <span className="text-[#FF0000]"><strong>READT</strong>alk</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-lg flex flex-col items-center gap-4 py-8">
                    <div className="fade-up">
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={fullName}
                                className="size-32 rounded-full object-cover border-4 border-neutral-200 dark:border-neutral-800"
                            />
                        ) : (
                            <div
                                className="size-32 rounded-full flex items-center justify-center text-white text-4xl font-bold"
                                style={{ backgroundColor: getColorFromName(fullName) }}
                            >
                                {initials}
                            </div>
                        )}
                    </div>

                    <div className="text-center fade-up fade-delay-1">
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                            {fullName}
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            @{user.username}
                        </p>
                        {user.bio && (
                            <p className="text-base text-neutral-700 dark:text-neutral-300 mt-4 max-w-md">
                                {user.bio}
                            </p>
                        )}
                    </div>

                    {activeSocials.length > 0 && (
                        <div className="w-full mt-6 space-y-2">
                            {activeSocials.map(([key, value], index) => {
                                const social = socialsMap[key];
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={key}
                                        href={social.url(value as string)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="fade-up w-full flex items-center gap-4 px-4 py-3 rounded-lg bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.99] transition-all"
                                        style={{ animationDelay: `${0.15 + index * 0.05}s` }}
                                    >
                                        <Icon size={28} weight="fill" className="text-neutral-900 dark:text-white flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-neutral-900 dark:text-white">
                                                {social.label}
                                            </div>
                                            <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                                @{value as string}
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    )}

                    <div className="w-full mt-8 flex flex-col items-center gap-3 fade-up fade-delay-3">
                        <Link
                            to="/"
                            className="flex w-full h-12 items-center justify-center rounded-full bg-[#FF0000] text-base font-semibold text-white shadow-md transition active:scale-[0.98] hover:bg-[#CC0000]"
                        >
                            Install
                        </Link>

                        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center pt-2">
                            © {currentYear} SOEPARNO ENTERPRISE Corp.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .fade-up {
                    animation: fadeUp 0.5s ease-out both;
                }
                .fade-delay-1 { animation-delay: 0.1s; }
                .fade-delay-3 { animation-delay: 0.3s; }
            `}</style>
        </div>
    );
}
