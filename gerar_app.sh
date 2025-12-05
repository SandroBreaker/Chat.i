#!/bin/bash

# Criar estrutura de pastas
mkdir -p src/components
mkdir -p src/services

# 1. Criar package.json
cat <<EOF > package.json
{
  "name": "whatschat-mobile",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.263.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.3"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
EOF

# 2. Criar vite.config.ts
cat <<EOF > vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
EOF

# 3. Criar tsconfig.json
cat <<EOF > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat <<EOF > tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

# 4. Criar index.html
cat <<EOF > index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WhatsChat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# 5. Criar src/types.ts
cat <<EOF > src/types.ts
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
EOF

# 6. Criar src/services/supabaseClient.ts (JA CONFIGURADO)
cat <<EOF > src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Configuração injetada conforme solicitado
const supabaseUrl = 'https://qvkfoitbatyrwqbicwwc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2ZvaXRiYXR5cndxYmljd3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjE5NjMsImV4cCI6MjA3OTIzNzk2M30.YzaC8z3e3ut6FFiNsr4e-NJtcVQvvLX-QuOKtjd78YM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
EOF

# 7. Criar src/components/Auth.tsx
cat <<EOF > src/components/Auth.tsx
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Lock, Mail, User } from 'lucide-react';

export default function Auth({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profilesMSP')
            .insert([{ id: authData.user.id, email, username }]);
          
          if (profileError) throw profileError;
          setMessage('Conta criada! Faça login.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin();
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-center mb-6 text-green-600">
          {isSignUp ? 'Criar Conta' : 'Login WhatsChat'}
        </h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              className="w-full pl-10 p-2 border rounded focus:outline-none focus:border-green-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {isSignUp && (
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nome de Usuário"
                className="w-full pl-10 p-2 border rounded focus:outline-none focus:border-green-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="password"
              placeholder="Senha"
              className="w-full pl-10 p-2 border rounded focus:outline-none focus:border-green-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition duration-200"
          >
            {loading ? 'Carregando...' : isSignUp ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-red-500 text-sm">{message}</p>}

        <p className="mt-4 text-center text-sm text-gray-600">
          {isSignUp ? 'Já tem conta? ' : 'Não tem conta? '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-green-600 font-bold hover:underline"
          >
            {isSignUp ? 'Entrar' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
}
EOF

# 8. Criar src/components/ChatInterface.tsx
cat <<EOF > src/components/ChatInterface.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Profile, Message } from '../types';
import { Send, LogOut, User as UserIcon } from 'lucide-react';

export default function ChatInterface({ session }: { session: any }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfiles();
    
    // Inscrever para mensagens em tempo real
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new as Message;
        if (
          (newMsg.sender_id === session.user.id && newMsg.recipient_id === selectedUser?.id) ||
          (newMsg.sender_id === selectedUser?.id && newMsg.recipient_id === session.user.id)
        ) {
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profilesMSP')
      .select('*')
      .neq('id', session.user.id); // Não mostrar o próprio usuário
    if (data) setProfiles(data);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(\`and(sender_id.eq.\${session.user.id},recipient_id.eq.\${userId}),and(sender_id.eq.\${userId},recipient_id.eq.\${session.user.id})\`)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const { error } = await supabase.from('messages').insert({
      content: newMessage,
      sender_id: session.user.id,
      recipient_id: selectedUser.id
    });

    if (!error) {
      setNewMessage('');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Lista de Contatos */}
      <div className={\`w-full md:w-1/3 bg-white border-r \${selectedUser ? 'hidden md:block' : 'block'}\`}>
        <div className="p-4 bg-gray-200 flex justify-between items-center border-b">
          <h1 className="font-bold text-gray-700">Contatos</h1>
          <button onClick={() => supabase.auth.signOut()} className="text-red-500">
            <LogOut size={20} />
          </button>
        </div>
        <div className="overflow-y-auto h-full">
          {profiles.map(profile => (
            <div
              key={profile.id}
              onClick={() => { setSelectedUser(profile); fetchMessages(profile.id); }}
              className="p-4 border-b hover:bg-gray-50 cursor-pointer flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <UserIcon className="text-gray-600" />
              </div>
              <div>
                <p className="font-semibold">{profile.username || profile.email}</p>
                <p className="text-xs text-gray-500">Toque para conversar</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área do Chat */}
      <div className={\`w-full md:w-2/3 flex flex-col \${!selectedUser ? 'hidden md:flex' : 'flex'}\`}>
        {selectedUser ? (
          <>
            <div className="p-3 bg-green-700 text-white flex items-center gap-2 shadow">
              <button onClick={() => setSelectedUser(null)} className="md:hidden mr-2">←</button>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <UserIcon className="text-green-700" size={18} />
              </div>
              <span className="font-bold">{selectedUser.username || selectedUser.email}</span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-[#e5ded8]">
              {messages.map((msg, index) => {
                const isMe = msg.sender_id === session.user.id;
                return (
                  <div key={index} className={\`flex \${isMe ? 'justify-end' : 'justify-start'} mb-2\`}>
                    <div className={\`max-w-[70%] p-2 rounded-lg shadow \${isMe ? 'bg-[#dcf8c6]' : 'bg-white'}\`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-[10px] text-gray-500 text-right mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-gray-100 flex gap-2 items-center">
              <input
                type="text"
                className="flex-1 p-3 rounded-full border focus:outline-none"
                placeholder="Digite uma mensagem"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} className="p-3 bg-green-600 rounded-full text-white shadow">
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f0f2f5] text-gray-400">
            <p>Selecione um contato para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

# 9. Criar src/main.tsx
cat <<EOF > src/main.tsx
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { supabase } from './services/supabaseClient'
import Auth from './components/Auth'
import ChatInterface from './components/ChatInterface'
import './index.css'

function App() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <React.StrictMode>
      {session ? <ChatInterface session={session} /> : <Auth onLogin={() => {}} />}
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
EOF

# 10. Criar CSS Básico (index.css)
cat <<EOF > src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
EOF

echo "Arquivos criados com sucesso!"
