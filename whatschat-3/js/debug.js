/**
 * MÓDULO DE DEBUG MOBILE
 * Intercepta logs do console e mostra em um overlay togglable.
 */

export function initDebugConsole() {
    // Cria o Container do Console (inicialmente oculto)
    const debugContainer = document.createElement('div');
    debugContainer.id = 'mobile-debug-console';
    debugContainer.className = 'hidden'; // Oculto por padrão
    debugContainer.innerHTML = `
      <div class="debug-header">
        <span>CONSOLE / LOGS</span>
        <div class="debug-actions">
           <button id="btn-copy-logs">Copiar</button>
           <button id="btn-clear-logs">Limpar</button>
           <button id="btn-hide-logs">▼</button>
        </div>
      </div>
      <div id="debug-content" class="debug-content"></div>
    `;

    // Cria o Botão Flutuante (FAB) para abrir o console
    const fab = document.createElement('button');
    fab.id = 'debug-fab';
    fab.innerHTML = '🐛'; // Ícone de Bug
    fab.title = "Abrir Debug Console";
    
    document.body.appendChild(debugContainer);
    document.body.appendChild(fab);
  
    // --- EVENTOS DE TOGGLE ---
    
    // Abrir console
    fab.addEventListener('click', () => {
        debugContainer.classList.remove('hidden');
        fab.classList.add('hidden'); // Esconde o botão quando console abre
    });

    // Fechar (minimizar) console
    document.getElementById('btn-hide-logs').addEventListener('click', () => {
        debugContainer.classList.add('hidden');
        fab.classList.remove('hidden'); // Mostra botão de novo
    });
  
    // Limpar logs
    document.getElementById('btn-clear-logs').addEventListener('click', () => {
      document.getElementById('debug-content').innerHTML = '';
    });

    // Copiar Logs
    document.getElementById('btn-copy-logs').addEventListener('click', () => {
        const content = document.getElementById('debug-content');
        const logText = content.innerText; 
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(logText).then(() => {
                alert('Logs copiados! ✅');
            }).catch(err => {
                console.error('Falha ao copiar logs:', err);
                alert('Falha ao copiar. Selecione o texto manualmente.');
            });
        } else {
            alert('Clipboard API não suportada.');
        }
    });
  
    // --- INTERCEPTAÇÃO DO CONSOLE ---
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
  
    function appendLog(type, args) {
      const content = document.getElementById('debug-content');
      if (!content) return;
  
      const line = document.createElement('div');
      line.className = `log-line log-${type}`; 
      
      const message = Array.from(args).map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg, null, 2);
            } catch(e) {
                return '[Obj Circular]';
            }
        }
        return String(arg);
      }).join(' ');
  
      const time = new Date().toLocaleTimeString().split(' ')[0];
      line.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
      
      content.appendChild(line);
      content.scrollTop = content.scrollHeight; 
    }
  
    console.log = function() {
      originalLog.apply(console, arguments);
      appendLog('info', arguments);
    };
  
    console.error = function() {
      originalError.apply(console, arguments);
      appendLog('error', arguments);
      // Opcional: Auto-abrir em caso de erro crítico
      // debugContainer.classList.remove('hidden');
      // fab.classList.add('hidden');
    };
  
    console.warn = function() {
      originalWarn.apply(console, arguments);
      appendLog('warn', arguments);
    };
  
    // Captura erros globais
    window.onerror = function(msg, url, line) {
      console.error(`Global Error: ${msg} \n(${url}:${line})`);
      return false;
    };
  
    // Captura Promises falhas
    window.addEventListener('unhandledrejection', function(event) {
      const reason = event.reason instanceof Error ? event.reason.message : event.reason;
      console.error('Unhandled Promise:', reason);
    });
  
    console.log("Debug Console Ativado.");
}