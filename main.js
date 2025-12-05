import { state } from './js/state.js';
import { showScreen } from './js/ui.js';
import { loadConfig, setupConfigListeners } from './js/config.js';
import { initializeSupabase } from './js/supabase.js';
import { setupAuthListeners, handleSessionSuccess } from './js/auth.js';
import { setupChatListeners } from './js/chat.js';

// --- INITIALIZATION ---
async function initApp() {
  loadConfig();
  setupConfigListeners();
  setupAuthListeners();
  setupChatListeners();
  
  if (!state.config) {
    showScreen('config');
    return;
  }

  initializeSupabase();
  
  if (state.supabase) {
    // Listen for auth changes globally
    state.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            handleSessionSuccess(session);
        }
        if (event === 'SIGNED_OUT') {
            state.session = null;
            state.currentUser = null;
            showScreen('auth');
        }
    });

    // Initial session check
    const { data: { session } } = await state.supabase.auth.getSession();
    
    if (session) {
        handleSessionSuccess(session);
    } else {
        showScreen('auth');
    }
  }
}

// Start the app
initApp();