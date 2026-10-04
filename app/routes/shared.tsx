import { useLoaderData } from "react-router-dom";
import { BlueSkyLogo, FacebookLogo, InstagramLogo, TiktokLogo, XLogo, YoutubeLogo, LinkedinLogo } from "@phosphor-icons/react";
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
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex-1">
                    <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Profile
                    </h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-lg flex flex-col items-center gap-4 py-8">
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

                    <div className="text-center">
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
                            {activeSocials.map(([key, value]) => {
                                const social = socialsMap[key];
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={key}
                                        href={social.url(value as string)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center gap-4 px-4 py-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
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
                </div>
            </div>
        </div>
    );
}
