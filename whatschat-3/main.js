import { state } from './js/state.js';
import { showScreen } from './js/ui.js';
import { loadConfig } from './js/config.js';
import { initializeSupabase } from './js/supabase.js';
import { setupAuthListeners, handleSessionSuccess } from './js/auth.js';
import { setupChatListeners } from './js/chat.js';
import { initDebugConsole } from './js/debug.js';

// Inicialização
async function initApp() {
  // Inicializa o Debug Console (mesmo que oculto)
  initDebugConsole();
  console.log("%c INICIANDO NEBULA CHAT ", "background: #6366f1; color: white; padding: 4px; border-radius: 4px;");
  
  try {
      // 1. Carregar Configurações
      loadConfig();
      
      // 2. Inicializar Supabase
      try {
          initializeSupabase();
      } catch (e) {
          throw new Error("Falha crítica ao conectar com Supabase: " + e.message);
      }

      // 3. Configurar Listeners (Botões e Inputs)
      setupAuthListeners();
      setupChatListeners(); // Prepara o chat mesmo antes de logar

      // 4. Verificar Sessão
      if (state.supabase) {
        
        // Listener de mudanças de estado (Login/Logout)
        state.supabase.auth.onAuthStateChange((event, session) => {
            console.log(`📡 Evento Auth: ${event}`);
            if (event === 'SIGNED_IN' && session) {
                handleSessionSuccess(session);
            } else if (event === 'SIGNED_OUT') {
                state.session = null;
                state.currentUser = null;
                showScreen('auth');
            }
        });

        // Checagem inicial
        const { data: { session }, error } = await state.supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            console.log("✅ Sessão recuperada para:", session.user.email);
            await handleSessionSuccess(session);
        } else {
            console.log("👤 Nenhuma sessão ativa. Mostrando Login.");
            showScreen('auth');
        }

      } else {
          throw new Error("Supabase Client não foi criado.");
      }

  } catch (error) {
      console.error("❌ ERRO FATAL NA INICIALIZAÇÃO:", error);
      
      // Força a remoção do loading e mostra erro na tela
      const loading = document.getElementById('screen-loading');
      if(loading) {
          loading.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #ff6b6b;">
                <h3>Erro de Inicialização</h3>
                <p style="font-size: 12px; margin-top: 10px;">${error.message}</p>
                <button onclick="window.location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #333; color: white; border: none; border-radius: 4px;">Recarregar</button>
            </div>
          `;
      }
  }
}

// Garante que o DOM carregou antes de rodar
document.addEventListener('DOMContentLoaded', initApp);