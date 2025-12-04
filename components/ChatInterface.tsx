import React, { useEffect, useState, useRef } from 'react';
import { getSupabase, clearSupabaseConfig } from '../services/supabaseClient';
import { Profile, Message } from '../types';
import { LogOut, Send, MoreVertical, Phone, Video, ArrowLeft, Search, PlusCircle, User } from 'lucide-react';

interface ChatInterfaceProps {
  sessionUser: any;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionUser }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch users from profilesMSP
  useEffect(() => {
    const fetchUsers = async () => {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('profilesMSP')
        .select('*')
        .neq('id', sessionUser.id); // Don't show self

      if (error) console.error('Error fetching users:', error);
      else setUsers(data || []);
      setLoadingUsers(false);
    };

    fetchUsers();
  }, [sessionUser.id, supabase]);

  // Fetch messages when a user is selected
  useEffect(() => {
    if (!selectedUser || !supabase) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${sessionUser.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${sessionUser.id})`)
        .order('created_at', { ascending: true });

      if (error) console.error('Error fetching messages:', error);
      else setMessages(data || []);
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel('chat_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${sessionUser.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === selectedUser.id) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, sessionUser.id, supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !supabase) return;

    const msgContent = newMessage.trim();
    setNewMessage(''); // Optimistic clear

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          content: msgContent,
          sender_id: sessionUser.id,
          recipient_id: selectedUser.id,
        },
      ])
      .select();

    if (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } else if (data) {
      setMessages((prev) => [...prev, data[0] as Message]);
    }
  };

  const handleLogout = async () => {
    if (supabase) await (supabase.auth as any).signOut();
  };

  const handleSelectUser = (user: Profile) => {
    setSelectedUser(user);
    setIsMobileListVisible(false);
  };

  const handleBackToList = () => {
    setIsMobileListVisible(true);
    setSelectedUser(null);
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      {/* Green background header strip for desktop aesthetic */}
      <div className="absolute top-0 w-full h-32 bg-emerald-600 z-0 hidden md:block"></div>

      <div className="z-10 w-full h-full flex flex-col md:flex-row md:max-w-[1600px] md:mx-auto md:h-[95vh] md:mt-[2.5vh] md:rounded-lg overflow-hidden md:shadow-2xl">
        
        {/* Sidebar / User List */}
        <div className={`${isMobileListVisible ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[30%] lg:w-[400px] bg-white border-r border-gray-200`}>
          {/* Sidebar Header */}
          <div className="bg-gray-100 p-4 flex justify-between items-center border-b border-gray-200">
            <div className="relative group cursor-pointer">
              <img 
                src={`https://ui-avatars.com/api/?name=${sessionUser.email}&background=059669&color=fff`} 
                alt="Profile" 
                className="w-10 h-10 rounded-full"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            
            <div className="flex gap-4 text-gray-600">
              <button title="New Chat" className="hover:bg-gray-200 p-2 rounded-full transition"><PlusCircle size={24} /></button>
              <button title="Settings" onClick={() => { if(confirm('Desconectar do Supabase e Sair?')) { clearSupabaseConfig(); } }} className="hover:bg-gray-200 p-2 rounded-full transition"><LogOut size={24} /></button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 bg-white border-b border-gray-100">
            <div className="relative bg-gray-100 rounded-lg px-4 py-2 flex items-center">
              <Search size={18} className="text-gray-500 mr-3" />
              <input 
                type="text" 
                placeholder="Pesquisar ou começar uma nova conversa" 
                className="bg-transparent w-full text-sm focus:outline-none text-gray-700 placeholder-gray-500"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
            {loadingUsers ? (
              <div className="flex items-center justify-center h-20 text-gray-500">Carregando contatos...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Nenhum outro usuário encontrado.</p>
                <p className="text-xs mt-2">Crie outra conta em uma aba anônima para testar o chat.</p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors ${selectedUser?.id === user.id ? 'bg-gray-100' : ''}`}
                >
                  <img
                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`}
                    alt={user.username}
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-gray-900 font-medium">{user.username}</h3>
                      {/* Placeholder for last message time */}
                      {/* <span className="text-xs text-gray-400">12:30</span> */}
                    </div>
                    {/* Placeholder for last message preview */}
                    <p className="text-sm text-gray-500 truncate">Clique para iniciar a conversa</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${!isMobileListVisible ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-[#efeae2] relative`}>
          {/* Chat Background Pattern Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 1.79 4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`
          }}></div>

          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200 z-10 shadow-sm">
                <div className="flex items-center">
                  <button onClick={handleBackToList} className="md:hidden mr-2 text-gray-600">
                    <ArrowLeft />
                  </button>
                  <img
                    src={selectedUser.avatar_url || `https://ui-avatars.com/api/?name=${selectedUser.username}`}
                    alt={selectedUser.username}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <h3 className="text-gray-900 font-medium">{selectedUser.username}</h3>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                </div>
                <div className="flex gap-4 text-gray-600">
                  <button className="hover:bg-gray-200 p-2 rounded-full transition"><Search size={20} /></button>
                  <button className="hover:bg-gray-200 p-2 rounded-full transition"><MoreVertical size={20} /></button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 z-10 space-y-2">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === sessionUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] md:max-w-[60%] rounded-lg px-3 py-1.5 shadow-sm relative text-sm ${
                          isOwn 
                            ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' 
                            : 'bg-white text-gray-900 rounded-tl-none'
                        }`}
                      >
                        <p className="mb-3 break-words leading-relaxed">{msg.content}</p>
                        <span className={`text-[10px] absolute bottom-1 right-2 ${isOwn ? 'text-green-800' : 'text-gray-500'}`}>
                          {formatTime(msg.created_at)}
                          {isOwn && <span className="ml-1 text-blue-500">✓✓</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-gray-100 px-4 py-2 z-10">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <button type="button" className="p-2 text-gray-500 hover:text-gray-700 mb-1">
                    <PlusCircle size={24} />
                  </button>
                  <div className="flex-1 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200 focus-within:ring-1 focus-within:ring-emerald-500">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Mensagem"
                      className="w-full bg-transparent focus:outline-none max-h-32 text-gray-700"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className={`p-3 rounded-full mb-1 shadow-sm transition-colors ${
                      newMessage.trim() 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'bg-gray-200 text-gray-400 cursor-default'
                    }`}
                    disabled={!newMessage.trim()}
                  >
                    <Send size={20} className={newMessage.trim() ? 'ml-0.5' : ''} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 z-10 opacity-70">
              <div className="bg-gray-200 p-6 rounded-full mb-6">
                <User size={64} className="text-gray-400" />
              </div>
              <h2 className="text-3xl font-light text-gray-600 mb-4">WhatsChat Web</h2>
              <p className="text-gray-500 max-w-md text-sm">
                Envie e receba mensagens sem precisar manter seu celular conectado.
                <br />
                Use o WhatsChat em até 4 aparelhos e 1 celular.
              </p>
              <div className="mt-10 text-xs text-gray-400 flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-300 rounded-full inline-block"></span>
                Protegido com criptografia de ponta-a-ponta (simulado)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};