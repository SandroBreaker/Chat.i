
export function showScreen(name) {
  // Mapeamento dinâmico para garantir que buscamos o elemento no momento da execução
  const screens = {
    loading: document.getElementById('screen-loading'),
    auth: document.getElementById('screen-auth'),
    chat: document.getElementById('screen-chat')
  };

  // 1. Ocultar todas as telas
  Object.values(screens).forEach(el => {
    if (el) el.classList.add('hidden');
  });

  // 2. Mostrar a tela alvo
  const target = screens[name];
  if (target) {
    target.classList.remove('hidden');
    
    // Restaura o display correto
    if (name === 'chat' || name === 'auth' || name === 'loading') {
        target.style.display = 'flex';
    }
  } else {
    console.warn(`Tela "${name}" não encontrada no DOM.`);
  }
  
  // Atualiza ícones se necessário
  if (window.lucide) window.lucide.createIcons();
}