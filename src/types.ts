export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  email: string;
}

export interface Message {
  id: number;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  is_read: boolean;
}
