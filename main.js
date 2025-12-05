
import { state } from './js/state.js';
import { showScreen } from './js/ui.js';
import { loadConfig } from './js/config.js';
import { initializeSupabase } from './js/supabase.js';
import { setupAuthListeners, handleSessionSuccess } from './js/auth.js';
import { setupChatListeners } from './js/chat.js';
import { initDebugConsole } from './js/debug.js';

// Inicialização
async function initApp() {
  initDebugConsole();
  console.log("%c 🚀 BOOTSTRAP V2 - INICIANDO NEBULA CHAT ", "background: #10b981; color: white; padding: 4px; border-radius: 4px;");
  
  try {
      loadConfig();
      initializeSupabase();

      // Configura Listeners de UI
      setupAuthListeners();
      setupChatListeners(); 

      if (!state.supabase) throw new Error("Supabase Client falhou.");

      // --- ESTRATÉGIA DE INICIALIZAÇÃO ROBUSTA ---
      
      // 1. Configurar Listener (Reactive)
      state.supabase.auth.onAuthStateChange((event, session) => {
          console.log(`📡 Evento Auth: ${event}`);
          
          if (event === 'SIGNED_OUT') {
              window.location.reload();
              return;
          }

          if (session) {
              handleSessionSuccess(session);
          }
      });

      // 2. Verificação Explícita Imediata (Proactive)
      // Não dependemos apenas do evento 'INITIAL_SESSION' que pode falhar/atrasar
      const { data, error } = await state.supabase.auth.getSession();
      
      if (error) {
          console.error("Erro ao verificar sessão inicial:", error);
          showScreen('auth');
      } else if (data.session) {
          console.log("✅ Sessão ativa encontrada via getSession.");
          handleSessionSuccess(data.session);
      } else {
          console.log("ℹ️ Nenhuma sessão ativa. Exibindo Login.");
          showScreen('auth');
      }

      // 3. Timeout de Segurança (Failsafe)
      // Se em 3 segundos nada acontecer (rede lenta ou falha de script), força a tela de Auth
      setTimeout(() => {
          const loading = document.getElementById('screen-loading');
          if (loading && !loading.classList.contains('hidden') && !state.currentUser) {
              console.warn("⚠️ Timeout de inicialização: Forçando tela de Auth.");
              showScreen('auth');
          }
      }, 3000);

  } catch (error) {
      console.error("❌ ERRO FATAL:", error);
      const loading = document.getElementById('screen-loading');
      if(loading) {
          loading.innerHTML = `<div style="color:white; text-align:center; padding:20px;">Erro fatal: ${error.message}<br><button onclick="location.reload()" style="margin-top:10px; color:black;">Recarregar</button></div>`;
      }
  }
}

document.addEventListener('DOMContentLoaded', initApp);
