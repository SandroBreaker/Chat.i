export const screens = {
  loading: document.getElementById('screen-loading'),
  auth: document.getElementById('screen-auth'),
  chat: document.getElementById('screen-chat')
};

export function showScreen(name) {
  Object.values(screens).forEach(el => {
    if (el) el.classList.add('hidden');
  });

  const target = screens[name];
  if (target) {
    target.classList.remove('hidden');
    // Restaura display flex para telas que precisam
    if (name === 'chat' || name === 'auth' || name === 'loading') {
        target.style.display = 'flex';
    }
  }
  
  if (window.lucide) window.lucide.createIcons();
}
