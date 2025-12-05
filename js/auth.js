import { state } from './state.js';
import { showScreen } from './ui.js';
import { loadUsers } from './chat.js';

export async function handleSessionSuccess(session) {
  state.session = session;
  // Fetch full profile info if needed, for now use session user
  state.currentUser = {
    id: session.user.id,
    email: session.user.email
  };
  
  // Update User UI
  document.getElementById('current-user-avatar').src = `https://ui-avatars.com/api/?name=${state.currentUser.email}&background=059669&color=fff`;
  document.getElementById('current-user-name').textContent = state.currentUser.email.split('@')[0];

  await loadUsers();
  showScreen('chat');
}

export function setupAuthListeners() {
  // Toggle Login/Signup Mode
  document.getElementById('auth-toggle-btn').addEventListener('click', (e) => {
    e.preventDefault();
    state.isLoginMode = !state.isLoginMode;
    
    const title = document.getElementById('auth-title');
    const btnText = document.getElementById('auth-btn-text');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const nameField = document.getElementById('field-username');
    
    if (state.isLoginMode) {
      title.textContent = 'Entrar na sua conta';
      btnText.textContent = 'Entrar';
      toggleBtn.textContent = 'Não tem conta? Crie agora';
      nameField.classList.add('hidden');
    } else {
      title.textContent = 'Criar nova conta';
      btnText.textContent = 'Cadastrar';
      toggleBtn.textContent = 'Já tem conta? Faça login';
      nameField.classList.remove('hidden');
    }
  });

  // Auth Form Submit
  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;
    const username = document.getElementById('input-username').value;
    const errorDiv = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');
    
    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50');

    try {
      if (state.isLoginMode) {
        const { error } = await state.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await state.supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          // Create Profile
          await state.supabase.from('profilesMSP').insert([{
            id: data.user.id,
            email: email,
            username: username || email.split('@')[0],
            avatar_url: `https://ui-avatars.com/api/?name=${username || email}&background=random`
          }]);
        }
      }
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50');
    }
  });

  // Logout Button
  document.getElementById('btn-logout').addEventListener('click', async () => {
      if(confirm("Deseja realmente sair?")) {
          await state.supabase.auth.signOut();
          window.location.reload();
      }
  });
}