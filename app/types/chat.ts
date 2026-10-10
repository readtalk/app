export type Channel = {
    id: string
    name: string
    description: string | null
    is_private: boolean
    created_at: number
    member_count: number
    member_ids: string[]
    admin_ids: string[]
    invite_policy: 'admin' | 'all'
}

export type Socials = {
    bluesky?: string
    facebook?: string
    instagram?: string
    tiktok?: string
    x?: string
    youtube?: string
    linkedin?: string
}

export type User = {
    id: string
    email: string
    first_name: string
    last_name: string
    username: string | null
    username_updated_at?: number | null
    avatar: string | null
    bio?: string | null
    socials?: Socials | null
    status?: 'online' | 'offline'
}

export interface MessageAsset {
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Message {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    created_at: number;
    assets?: MessageAsset[];
}
