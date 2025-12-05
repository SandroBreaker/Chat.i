import { state } from './state.js';
import { showScreen } from './ui.js';
import { loadUsers, clearChatCache } from './chat.js';

export async function handleSessionSuccess(session) {
  // IDEMPOTÊNCIA: Se já estamos configurados com esse usuário, não faz nada.
  // Isso protege contra disparos múltiplos de eventos do Supabase.
  if (state.currentUser && state.currentUser.id === session.user.id) {
      console.log("🔄 Sessão já ativa para este usuário. Ignorando reinicialização.");
      return;
  }

  console.log("handleSessionSuccess iniciado...");
  state.session = session;
  state.currentUser = {
    id: session.user.id,
    email: session.user.email
  };
  
  // Solicitar permissão de notificação assim que logar
  if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
          console.log("Permissão de notificação:", permission);
      });
  }
  
  // UI do User atual
  const avatarEl = document.getElementById('current-user-avatar');
  if(avatarEl) {
      avatarEl.src = `https://ui-avatars.com/api/?name=${state.currentUser.email}&background=00a884&color=fff`;
  }
  
  try {
      const { error } = await state.supabase
        .from('profilesMSP')
        .upsert({ 
            id: session.user.id,
            email: session.user.email,
            username: session.user.email.split('@')[0],
            avatar_url: `https://ui-avatars.com/api/?name=${session.user.email}&background=random`
        }, { onConflict: 'id' })
        .select();
      
      if(error) console.warn("Aviso ao sincronizar perfil (Upsert):", error);
      else console.log("Perfil sincronizado com sucesso.");

  } catch(e) {
      console.error("Erro ao tentar auto-correção de perfil:", e);
  }

  console.log("Carregando lista de usuários...");
  await loadUsers();
  showScreen('chat');
}

export function setupAuthListeners() {
  const toggleBtn = document.getElementById('auth-toggle-btn');
  if(toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.isLoginMode = !state.isLoginMode;
      
      const title = document.getElementById('auth-title');
      const btnText = document.getElementById('auth-btn-text');
      const nameField = document.getElementById('field-username');
      
      if (state.isLoginMode) {
        title.textContent = 'Entrar no WhatsChat';
        btnText.textContent = 'ACESSAR';
        toggleBtn.textContent = 'Não tem conta? Crie agora';
        nameField.classList.add('hidden');
      } else {
        title.textContent = 'Criar nova conta';
        btnText.textContent = 'CADASTRAR';
        toggleBtn.textContent = 'Já tem conta? Faça login';
        nameField.classList.remove('hidden');
      }
    });
  }

  const authForm = document.getElementById('auth-form');
  if(authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('input-email').value;
      const password = document.getElementById('input-password').value;
      const username = document.getElementById('input-username').value;
      const errorDiv = document.getElementById('auth-error');
      const submitBtn = document.getElementById('auth-submit-btn');
      
      errorDiv.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin inline-block"></i> AGUARDE...';
      if(window.lucide) window.lucide.createIcons();

      try {
        if (state.isLoginMode) {
          const { error } = await state.supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          console.log("Login solicitado com sucesso.");
        } else {
          console.log("Tentando cadastro...");
          const { data, error } = await state.supabase.auth.signUp({ email, password });
          if (error) throw error;
          
          if (data.user) {
            console.log("Usuário Auth criado. Criando perfil em 'profilesMSP'...");
            const { error: profileError } = await state.supabase.from('profilesMSP').insert([{
              id: data.user.id,
              email: email,
              username: username || email.split('@')[0],
              avatar_url: `https://ui-avatars.com/api/?name=${username || email}&background=random`
            }]);
            
            if (profileError) {
                // Se falhar ao criar perfil, mas user foi criado, apenas loga o erro.
                // O upsert no login subsequente corrigirá isso.
                console.error("Erro não-crítico ao criar perfil:", profileError);
            }
            
            alert("Conta criada! Você já pode entrar.");
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Erro de Auth:", err);
        errorDiv.textContent = err.message || "Erro desconhecido";
        errorDiv.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = state.isLoginMode ? 'ACESSAR' : 'CADASTRAR';
      }
    });
  }

  // --- LISTENERS DA SIDEBAR (LOGOUT & RELOAD) ---
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
          if (confirm("Deseja realmente sair?")) {
              clearChatCache(); // Limpa cache local de usuários
              await state.supabase.auth.signOut();
              window.location.reload();
          }
      });
  }

  const btnReload = document.getElementById('btn-reload-users');
  if (btnReload) {
      btnReload.addEventListener('click', async () => {
          const icon = btnReload.querySelector('svg') || btnReload.querySelector('i');
          if(icon) icon.style.transition = 'transform 0.5s';
          if(icon) icon.style.transform = 'rotate(180deg)';
          
          await loadUsers(true); 
          
          setTimeout(() => { if(icon) icon.style.transform = 'rotate(0deg)'; }, 500);
      });
  }
}