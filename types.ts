export interface Profile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  updated_at?: string;
}

export interface Message {
  id: number;
  created_at: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  is_read: boolean;
}

export interface ChatSession {
  user: Profile;
  lastMessage?: Message;
}

export interface SupabaseConfig {
  url: string;
  key: string;
}