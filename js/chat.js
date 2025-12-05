import { state } from './state.js';

export async function loadUsers() {
  const listEl = document.getElementById('users-list');
  listEl.innerHTML = '<div class="p-4 text-gray-500 text-center">Carregando...</div>';
  
  const { data, error } = await state.supabase
    .from('profilesMSP')
    .select('*')
    .neq('id', state.currentUser.id);

  listEl.innerHTML = ''; // Clear loading

  if (!data || data.length === 0) {
    listEl.innerHTML = '<div class="p-8 text-center text-gray-500 text-sm">Nenhum contato encontrado.</div>';
    return;
  }

  state.users = data;
  
  data.forEach(user => {
    const el = document.createElement('div');
    el.className = 'flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors user-item';
    el.dataset.id = user.id;
    el.innerHTML = `
      <img src="${user.avatar_url || 'https://ui-avatars.com/api/?name=' + user.username}" class="w-12 h-12 rounded-full mr-4 object-cover">
      <div class="flex-1">
        <div class="flex justify-between items-baseline">
          <h3 class="text-gray-900 font-medium">${user.username}</h3>
        </div>
        <p class="text-sm text-gray-500 truncate">Clique para conversar</p>
      </div>
    `;
    el.addEventListener('click', () => selectUser(user));
    listEl.appendChild(el);
  });
}

export function selectUser(user) {
  state.selectedUser = user;
  
  // UI toggles for mobile
  document.getElementById('chat-sidebar').classList.add('hidden');
  document.getElementById('chat-sidebar').classList.remove('flex'); // For mobile logic
  document.getElementById('chat-sidebar').classList.add('md:flex'); // Restore for desktop
  
  document.getElementById('chat-area').classList.remove('hidden');
  document.getElementById('chat-area').classList.add('flex');
  
  document.getElementById('chat-empty-state').classList.add('hidden');
  document.getElementById('chat-active-container').classList.remove('hidden');
  document.getElementById('chat-active-container').classList.add('flex');

  // Set Header
  document.getElementById('chat-header-name').textContent = user.username;
  document.getElementById('chat-header-avatar').src = user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`;
  
  loadMessages();
}

async function loadMessages() {
  const container = document.getElementById('messages-list');
  container.innerHTML = '<div class="text-center text-sm text-gray-400 mt-4">Carregando mensagens...</div>';
  
  const { data } = await state.supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${state.currentUser.id},recipient_id.eq.${state.selectedUser.id}),and(sender_id.eq.${state.selectedUser.id},recipient_id.eq.${state.currentUser.id})`)
    .order('created_at', { ascending: true });
    
  state.messages = data || [];
  renderMessages();
  subscribeToRealtime();
}

function renderMessages() {
  const container = document.getElementById('messages-list');
  container.innerHTML = '';
  
  state.messages.forEach(msg => {
    const isOwn = msg.sender_id === state.currentUser.id;
    const div = document.createElement('div');
    div.className = `flex ${isOwn ? 'justify-end' : 'justify-start'}`;
    
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    div.innerHTML = `
      <div class="max-w-[75%] md:max-w-[60%] rounded-lg px-3 py-1.5 shadow-sm relative text-sm ${isOwn ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}">
        <p class="mb-3 break-words leading-relaxed">${msg.content}</p>
        <span class="text-[10px] absolute bottom-1 right-2 ${isOwn ? 'text-green-800' : 'text-gray-500'}">
          ${time} ${isOwn ? '<span class="ml-1 text-blue-500">✓✓</span>' : ''}
        </span>
      </div>
    `;
    container.appendChild(div);
  });
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function subscribeToRealtime() {
  if (state.realtimeChannel) {
    state.supabase.removeChannel(state.realtimeChannel);
  }
  
  state.realtimeChannel = state.supabase
    .channel('chat_channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${state.currentUser.id}`,
      },
      (payload) => {
        const newMsg = payload.new;
        if (state.selectedUser && newMsg.sender_id === state.selectedUser.id) {
          state.messages.push(newMsg);
          renderMessages();
        }
      }
    )
    .subscribe();
}

export function setupChatListeners() {
  // Back button (Mobile)
  document.getElementById('btn-back-list').addEventListener('click', () => {
    document.getElementById('chat-sidebar').classList.remove('hidden');
    document.getElementById('chat-sidebar').classList.add('flex');
    document.getElementById('chat-area').classList.add('hidden');
    state.selectedUser = null;
  });

  // Send Message
  document.getElementById('message-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content || !state.selectedUser) return;
    
    input.value = ''; // Optimistic clear
    
    const { data, error } = await state.supabase
      .from('messages')
      .insert([{
        content: content,
        sender_id: state.currentUser.id,
        recipient_id: state.selectedUser.id
      }])
      .select();
      
    if (data) {
      state.messages.push(data[0]);
      renderMessages();
    }
  });
}