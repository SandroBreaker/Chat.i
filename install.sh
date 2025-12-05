#!/bin/bash

# Criar estrutura de pastas
mkdir -p src/components
mkdir -p src/services

# 1. Criar index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WhatsChat</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Inter', sans-serif; background-color: #e5e7eb; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
EOF

# 2. Criar metadata.json
cat > metadata.json << 'EOF'
{
  "name": "WhatsChat",
  "description": "WhatsApp clone with Supabase",
  "requestFramePermissions": []
}
EOF

# 3. Criar src/types.ts
cat > src/types.ts << 'EOF'
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
EOF

# 4. Criar src/services/supabaseClient.ts
cat > src/services/supabaseClient.ts << 'EOF'
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

const DEFAULT_URL = "https://qvkfoitbatyrwqbicwwc.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2ZvaXRiYXR5cndxYmljd3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjE5NjMsImV4cCI6MjA3OTIzNzk2M30.YzaC8z3e3ut6FFiNsr4e-NJtcVQvvLX-QuOKtjd78YM";

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseConfig = (): SupabaseConfig | null => {
  const stored = localStorage.getItem('supabase-config');
  if (stored) return JSON.parse(stored);
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
  }
  if (DEFAULT_URL && DEFAULT_KEY) return { url: DEFAULT_URL, key: DEFAULT_KEY };
  return null;
};

export const saveSupabaseConfig = (config: SupabaseConfig) => {
  localStorage.setItem('supabase-config', JSON.stringify(config));
  supabaseInstance = createClient(config.url, config.key);
  window.location.reload();
};

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;
  const config = getSupabaseConfig();
  if (config) {
    supabaseInstance = createClient(config.url, config.key);
    return supabaseInstance;
  }
  return null;
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase-config');
  supabaseInstance = null;
  window.location.reload();
};
EOF

# 5. Criar src/components/ConfigScreen.tsx
cat > src/components/ConfigScreen.tsx << 'EOF'
import React, { useState } from 'react';
import { saveSupabaseConfig } from '../services/supabaseClient';
import { Database, Key, Save } from 'lucide-react';

export const ConfigScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) saveSupabaseConfig({ url, key });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Configuração</h1>
        <form onSubmit={handleSave} className="space-y-4">
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="block w-full p-2 border rounded" placeholder="Supabase URL" required />
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} className="block w-full p-2 border rounded" placeholder="Anon Key" required />
          <button type="submit" className="w-full bg-emerald-600 text-white p-2 rounded">Salvar</button>
        </form>
      </div>
    </div>
  );
};
EOF

# 6. Criar src/components/Auth.tsx
cat > src/components/Auth.tsx << 'EOF'
import React, { useState } from 'react';
import { getSupabase } from '../services/supabaseClient';
import { MessageSquare, Loader2, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabase();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true); setError(null);
    const auth = supabase.auth as any;

    try {
      if (isLogin) {
        const { error } = auth.signInWithPassword 
          ? await auth.signInWithPassword({ email, password })
          : await auth.signIn({ email, password });
        if (error) throw error;
      } else {
        const result = await auth.signUp({ email, password });
        const user = result.data?.user || result.user;
        if (result.error) throw result.error;
        if (user) {
          await supabase.from('profilesMSP').insert([{
            id: user.id, email, username: username || email.split('@')[0],
            avatar_url: `https://ui-avatars.com/api/?name=${username || email}`
          }]);
        }
      }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <MessageSquare className="mx-auto text-emerald-600 w-12 h-12" />
          <h2 className="text-2xl font-bold">WhatsChat</h2>
        </div>
        {error && <div className="text-red-600 mb-4 text-center text-sm">{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && <input type="text" placeholder="Nome" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 border rounded" required />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white p-2 rounded flex justify-center">
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-emerald-600">
          {isLogin ? 'Criar conta' : 'Já tenho conta'}
        </button>
      </div>
    </div>
  );
};
EOF

# 7. Criar src/components/ChatInterface.tsx
cat > src/components/ChatInterface.tsx << 'EOF'
import React, { useEffect, useState, useRef } from 'react';
import { getSupabase, clearSupabaseConfig } from '../services/supabaseClient';
import { Profile, Message } from '../types';
import { LogOut, Send, Search, PlusCircle, ArrowLeft, User, MoreVertical } from 'lucide-react';

interface ChatInterfaceProps { sessionUser: any; }

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionUser }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMobileList, setIsMobileList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('profilesMSP').select('*').neq('id', sessionUser.id);
      setUsers(data || []);
    };
    fetchUsers();
  }, [sessionUser.id]);

  useEffect(() => {
    if (!selectedUser || !supabase) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${sessionUser.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${sessionUser.id})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();
    const channel = supabase.channel('chat').on('postgres_changes', { 
      event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${sessionUser.id}` 
    }, (payload) => {
      const newMsg = payload.new as Message;
      if (newMsg.sender_id === selectedUser.id) setMessages(prev => [...prev, newMsg]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !supabase) return;
    const content = newMessage.trim();
    setNewMessage('');
    const { data } = await supabase.from('messages').insert([{
      content, sender_id: sessionUser.id, recipient_id: selectedUser.id
    }]).select();
    if (data) setMessages(prev => [...prev, data[0] as Message]);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      <div className="absolute top-0 w-full h-32 bg-emerald-600 z-0 hidden md:block"></div>
      <div className="z-10 w-full h-full flex md:max-w-[1600px] md:mx-auto md:h-[95vh] md:mt-[2.5vh] bg-white md:rounded-lg overflow-hidden md:shadow-2xl">
        <div className={`${isMobileList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[400px] border-r`}>
          <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
            <img src={`https://ui-avatars.com/api/?name=${sessionUser.email}`} className="w-10 h-10 rounded-full" />
            <button onClick={() => confirm('Sair?') && clearSupabaseConfig()}><LogOut size={24} className="text-gray-600" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {users.map(user => (
              <div key={user.id} onClick={() => { setSelectedUser(user); setIsMobileList(false); }} className={`p-3 flex items-center hover:bg-gray-50 cursor-pointer ${selectedUser?.id === user.id ? 'bg-gray-100' : ''}`}>
                <img src={user.avatar_url} className="w-12 h-12 rounded-full mr-4" />
                <div className="font-medium">{user.username}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={`${!isMobileList ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-[#efeae2]`}>
          {selectedUser ? (
            <>
              <div className="bg-gray-100 p-3 flex items-center border-b shadow-sm z-10">
                <button onClick={() => setIsMobileList(true)} className="md:hidden mr-2"><ArrowLeft /></button>
                <img src={selectedUser.avatar_url} className="w-10 h-10 rounded-full mr-3" />
                <span className="font-medium">{selectedUser.username}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === sessionUser.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-1.5 rounded-lg text-sm ${msg.sender_id === sessionUser.id ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="bg-gray-100 p-2">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 p-2 rounded-lg" placeholder="Mensagem" />
                  <button type="submit" className="p-2 bg-emerald-600 text-white rounded-full"><Send size={20} /></button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#efeae2]">Selecione um contato</div>
          )}
        </div>
      </div>
    </div>
  );
};
EOF

# 8. Criar src/App.tsx
cat > src/App.tsx << 'EOF'
import React, { useEffect, useState } from 'react';
import { getSupabase, getSupabaseConfig } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { ChatInterface } from './components/ChatInterface';
import { ConfigScreen } from './components/ConfigScreen';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config) { setHasConfig(false); setLoading(false); return; }
    setHasConfig(true);
    const supabase = getSupabase();
    if (!supabase) return;
    const auth = supabase.auth as any;
    
    const checkSession = async () => {
      if (auth.getSession) { const { data } = await auth.getSession(); setSession(data?.session ?? null); }
      else if (auth.session) { setSession(auth.session()); }
      setLoading(false);
    };
    checkSession();
    auth.onAuthStateChange((_ev: any, sess: any) => setSession(sess));
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600 w-10 h-10"/></div>;
  if (!hasConfig) return <ConfigScreen />;
  return session ? <ChatInterface sessionUser={session.user} /> : <Auth />;
};
export default App;
EOF

# 9. Criar src/index.tsx
cat > src/index.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");
const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><App /></React.StrictMode>);
EOF

echo "Arquivos gerados com sucesso."