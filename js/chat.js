import { state } from './state.js';

let allCachedUsers = [];

export function clearChatCache() {
    allCachedUsers = [];
    state.users = [];
    state.messages = [];
    state.selectedUser = null;
    if (state.realtimeChannel) {
        state.supabase.removeChannel(state.realtimeChannel);
        state.realtimeChannel = null;
    }
}

/* --- CARREGAR USUÁRIOS (Lista de Contatos) --- */
export async function loadUsers(forceReload = false) {
  const listEl = document.getElementById('users-list');
  if (!listEl) return;

  // Se já temos usuários e não é reload forçado, renderiza o cache
  // Mas GARANTE que a subscription global esteja ativa
  if (!forceReload && allCachedUsers.length > 0) {
    renderUserList(allCachedUsers);
    setupGlobalRealtimeSubscription(); 
    return;
  }

  // Skeleton Loading
  listEl.innerHTML = `<div style="padding: 16px;"><div class="skeleton" style="height: 60px; margin-bottom: 10px;"></div><div class="skeleton" style="height: 60px;"></div></div>`;
  
  try {
      if (!state.currentUser?.id) throw new Error("Usuário deslogado.");
      
      const { data, error } = await state.supabase
          .from('profilesMSP')
          .select('*')
          .neq('id', state.currentUser.id);
          
      if (error) throw error;

      state.users = data || [];
      allCachedUsers = state.users; 
      renderUserList(allCachedUsers);
      
      // Inicia listener GLOBAL (para notificações) após carregar usuários
      // (Precisamos dos usuários carregados para saber os nomes nas notificações)
      setupGlobalRealtimeSubscription();

  } catch (err) {
      console.error(err);
      listEl.innerHTML = `<div class="text-body" style="padding: 20px; text-align: center; color: var(--color-danger);">Erro ao carregar contatos.<br><small>${err.message}</small></div>`;
  }
}

function renderUserList(usersArray) {
  const listEl = document.getElementById('users-list');
  listEl.innerHTML = ''; 

  if (!usersArray || usersArray.length === 0) {
      listEl.innerHTML = `<div class="text-body" style="padding: 20px; text-align: center;">Nenhum contato encontrado.</div>`;
      return;
  }

  usersArray.forEach(user => {
    const el = document.createElement('div');
    el.className = 'chat-list-item';
    const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`;
    el.innerHTML = `
      <div class="avatar-container"><img src="${avatar}" class="avatar"></div>
      <div class="item-content">
        <div class="item-header"><span class="item-name">${user.username}</span><span class="item-time">Chat</span></div>
        <div class="item-preview"><span style="font-size: 0.8rem; color: var(--text-secondary);">Toque para conversar</span></div>
      </div>`;
    
    el.addEventListener('click', () => selectUser(user, el));
    listEl.appendChild(el);
  });
}

export function selectUser(user, elementRef) {
  state.selectedUser = user;
  
  document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
  if(elementRef) elementRef.classList.add('active');

  const sidebar = document.getElementById('chat-sidebar');
  const btnBack = document.getElementById('btn-back-list');
  if (window.innerWidth < 768) {
      sidebar.classList.add('hidden-mobile');
      if(btnBack) btnBack.style.display = 'block';
  }
  
  document.getElementById('chat-empty-state').classList.add('hidden');
  document.getElementById('chat-active-container').classList.remove('hidden');
  document.getElementById('chat-header-name').textContent = user.username;
  document.getElementById('chat-header-avatar').src = user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`;
  
  loadMessages();
}

/* --------------------------------------------------------------------------
   ALGORITMO DE CARGA: DUAL FETCH & MERGE
-------------------------------------------------------------------------- */
async function loadMessages() {
  const container = document.getElementById('messages-list');
  container.innerHTML = `<div class="typing-indicator" style="margin: 20px auto;"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  
  if (!state.currentUser || !state.selectedUser) {
      container.innerHTML = `<div class="text-body" style="text-align: center; margin-top: 20px; color: var(--color-danger);">Erro de sessão.</div>`;
      return;
  }
  
  const myId = state.currentUser.id;
  const partnerId = state.selectedUser.id;

  try {
      // 1. VARIÁVEL A: Busca as mensagens que EU enviei para ELE
      const sentPromise = state.supabase
        .from('messages')
        .select('*')
        .eq('sender_id', myId)
        .eq('recipient_id', partnerId);

      // 2. VARIÁVEL B: Busca as mensagens que ELE enviou para MIM
      const receivedPromise = state.supabase
        .from('messages')
        .select('*')
        .eq('sender_id', partnerId)
        .eq('recipient_id', myId);

      const [sentResponse, receivedResponse] = await Promise.all([sentPromise, receivedPromise]);

      if (sentResponse.error) throw sentResponse.error;
      if (receivedResponse.error) throw receivedResponse.error;

      const allMessages = [...(sentResponse.data || []), ...(receivedResponse.data || [])];

      // 3. ORDENAR POR DATE TIME
      allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      state.messages = allMessages;
      renderMessagesList(true);

      // NOTA: A inscrição no Realtime agora é GLOBAL (feita no loadUsers)
      // Não recriamos o canal aqui para evitar duplicidade.

  } catch (err) {
      console.error("❌ Falha no algoritmo de carga:", err);
      container.innerHTML = `<div class="text-body" style="text-align: center; margin-top: 20px; color: var(--color-danger);">Erro ao sincronizar conversa.</div>`;
  }
}

function renderMessagesList(scrollToBottom = false) {
  const container = document.getElementById('messages-list');
  container.innerHTML = '';
  
  if (state.messages.length === 0) {
      container.innerHTML = `<div class="text-body" style="text-align: center; margin-top: 40px; opacity: 0.5;">Inicie a conversa...</div>`;
      return;
  }

  state.messages.forEach(msg => appendMessageToDOM(msg, container));
  
  if (scrollToBottom) {
      // requestAnimationFrame é mais suave que setTimeout para UI updates
      requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
      });
  }
}

function appendMessageToDOM(msg, container) {
  // O sender_id determina quem é o 'owner' da mensagem
  const isOwn = msg.sender_id === state.currentUser.id;
  
  const divWrapper = document.createElement('div');
  divWrapper.style.display = 'flex';
  divWrapper.style.width = '100%';
  divWrapper.style.justifyContent = isOwn ? 'flex-end' : 'flex-start';
  divWrapper.style.marginBottom = '8px'; // Espaçamento visual melhorado
  
  const dateObj = new Date(msg.created_at);
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  divWrapper.innerHTML = `
    <div class="message-bubble ${isOwn ? 'message-out' : 'message-in'}">
      ${msg.content}
      <div class="bubble-meta">
         <span class="bubble-time">${timeStr}</span>
         ${isOwn ? '<i data-lucide="check" style="width: 12px;"></i>' : ''}
      </div>
    </div>`;
  
  container.appendChild(divWrapper);
  if(window.lucide) window.lucide.createIcons({ root: divWrapper });
}

/* --------------------------------------------------------------------------
   REALTIME GLOBAL & NOTIFICATIONS
   Ouve TODAS as mensagens recebidas para notificar, não apenas a conversa aberta.
-------------------------------------------------------------------------- */
function setupGlobalRealtimeSubscription() {
    if (state.realtimeChannel) {
        // Se o canal já existe, verificamos se ele está inscrito (opcional, mas seguro retornar)
        console.log("Realtime Channel já ativo.");
        return;
    }
  
    console.log("📡 Iniciando Subscription Global (Mensagens + Notificações)");
    
    state.realtimeChannel = state.supabase.channel('global_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new;
          const myId = state.currentUser?.id;
          
          if (!myId) return; // Segurança
  
          // CASO 1: Mensagem recebida por MIM
          if (newMsg.recipient_id === myId) {
              
              // A. Tenta enviar notificação Browser se necessário
              handleIncomingNotification(newMsg);
  
              // B. Se a conversa com esse remetente estiver ABERTA, atualiza UI
              if (state.selectedUser && state.selectedUser.id === newMsg.sender_id) {
                   const alreadyExists = state.messages.find(m => m.id === newMsg.id);
                   if(!alreadyExists) {
                      state.messages.push(newMsg);
                      appendMessageToDOM(newMsg, document.getElementById('messages-list'));
                      const container = document.getElementById('messages-list');
                      container.scrollTop = container.scrollHeight;
                   }
              }
          }
          // CASO 2: Mensagem enviada por MIM (em outra aba/dispositivo)
          else if (newMsg.sender_id === myId) {
              // Se eu estou com a conversa aberta com o destinatário, atualiza minha UI também
              if (state.selectedUser && state.selectedUser.id === newMsg.recipient_id) {
                   const alreadyExists = state.messages.find(m => m.id === newMsg.id);
                   if(!alreadyExists) {
                      state.messages.push(newMsg);
                      appendMessageToDOM(newMsg, document.getElementById('messages-list'));
                      const container = document.getElementById('messages-list');
                      container.scrollTop = container.scrollHeight;
                   }
              }
          }
      }).subscribe((status) => {
          console.log("Realtime Status:", status);
      });
  }
  
  function handleIncomingNotification(newMsg) {
      // Não notifica se eu estou focado na conversa do remetente
      const isChatOpen = state.selectedUser && state.selectedUser.id === newMsg.sender_id;
      const isWindowFocused = !document.hidden;
      
      // Se a janela está oculta OU o chat não é o que está aberto
      if (!isWindowFocused || !isChatOpen) {
          
          // Encontra quem enviou nos usuários cacheados
          const sender = state.users.find(u => u.id === newMsg.sender_id);
          const title = sender ? sender.username : "Nova Mensagem";
          const body = newMsg.content.includes('<img') ? '📷 [Imagem]' : newMsg.content;
          const icon = sender ? sender.avatar_url : null;
          
          sendNotification(title, body, icon);
      }
  }
  
  function sendNotification(title, body, icon) {
      if (!("Notification" in window)) return;
      
      if (Notification.permission === "granted") {
          const notif = new Notification(title, {
              body: body,
              icon: icon || '/favicon.ico',
              tag: 'nebula-chat-msg' // Evita spam excessivo
          });
          
          notif.onclick = function() {
              window.focus();
              notif.close();
          };
      }
  }

// Utilitário: Converte File para Base64 Comprimido (Canvas)
async function compressAndConvertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Redimensiona para max 800px width para economizar banco
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                canvas.height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Retorna JPG com 0.7 qualidade
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/* --- LISTENERS DO CHAT (Garantia do Sender ID) --- */
export function setupChatListeners() {
  const btnBack = document.getElementById('btn-back-list');
  if(btnBack) {
    btnBack.addEventListener('click', () => {
      document.getElementById('chat-sidebar').classList.remove('hidden-mobile');
      btnBack.style.display = 'none';
    });
  }

  // --- LÓGICA DE ENVIO DE TEXTO ---
  const form = document.getElementById('message-form');
  if(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('message-input');
      const content = input.value.trim();
      
      if (!content || !state.selectedUser) return;
      
      // *** VERIFICAÇÃO DE SEGURANÇA ***
      const { data: { user } } = await state.supabase.auth.getUser();
      const actualSenderId = user?.id;
      
      if (!actualSenderId) {
          console.error("❌ Falha crítica: ID do remetente autenticado não encontrado.");
          return;
      }
      
      input.value = ''; input.focus();

      await sendMessage(content, actualSenderId);
    });
  }

  // --- LÓGICA DE ENVIO DE IMAGEM ---
  const btnAttach = document.getElementById('btn-attach');
  const fileInput = document.getElementById('hidden-file-input');

  if (btnAttach && fileInput) {
      btnAttach.addEventListener('click', () => {
          fileInput.click(); // Abre o seletor nativo
      });

      fileInput.addEventListener('change', async (e) => {
          if (e.target.files && e.target.files[0]) {
              const file = e.target.files[0];
              console.log("Processando imagem...", file.name);
              
              try {
                  const base64 = await compressAndConvertToBase64(file);
                  const imgTag = `<img src="${base64}" class="msg-image" alt="Imagem enviada" />`;
                  
                  const { data: { user } } = await state.supabase.auth.getUser();
                  if (!user?.id) throw new Error("Sessão inválida");

                  await sendMessage(imgTag, user.id);
                  
                  fileInput.value = ''; 
              } catch (err) {
                  console.error("Erro ao enviar imagem:", err);
                  alert("Erro ao processar imagem.");
              }
          }
      });
  }
}

async function sendMessage(contentString, senderId) {
    const tempMsg = {
        content: contentString, 
        sender_id: senderId, 
        recipient_id: state.selectedUser.id,
        created_at: new Date().toISOString(), 
        read: false
    };
    
    // Render Otimista
    state.messages.push(tempMsg);
    appendMessageToDOM(tempMsg, document.getElementById('messages-list'));
    const container = document.getElementById('messages-list');
    container.scrollTop = container.scrollHeight;

    // Envio para o Banco
    await state.supabase.from('messages').insert([tempMsg]);
}

const searchInput = document.getElementById('contact-search-input');
if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if(allCachedUsers.length) renderUserList(allCachedUsers.filter(u => u.username.toLowerCase().includes(term)));
    });
}