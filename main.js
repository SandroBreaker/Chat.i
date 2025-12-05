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
      setupChatListeners(); 

      // 4. Verificar Sessão (Apenas via Listener para evitar duplicidade)
      if (state.supabase) {
        
        // Listener único de verdade
        state.supabase.auth.onAuthStateChange((event, session) => {
            console.log(`📡 Evento Auth: ${event} | Possui Sessão? ${!!session}`);
            
            if (session) {
                // CASO A: Usuário Autenticado
                // INITIAL_SESSION: Disparado ao carregar a página se houver token
                // SIGNED_IN: Disparado após login explícito
                // TOKEN_REFRESHED: Atualização de token (manter sessão)
                if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    handleSessionSuccess(session);
                } 
            } else {
                // CASO B: Não autenticado (Logout ou App aberto sem cookie)
                // Se INITIAL_SESSION vier null, precisamos ir para o Auth
                console.log("Nenhuma sessão ativa detectada. Indo para Auth.");
                state.session = null;
                state.currentUser = null;
                showScreen('auth');
            }
        });

      } else {
          throw new Error("Supabase Client não foi criado.");
      }

  } catch (error) {
      console.error("❌ ERRO FATAL NA INICIALIZAÇÃO:", error);
      
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

document.addEventListener('DOMContentLoaded', initApp);