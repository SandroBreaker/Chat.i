export const screens = {
  loading: document.getElementById('screen-loading'),
  config: document.getElementById('screen-config'),
  auth: document.getElementById('screen-auth'),
  chat: document.getElementById('screen-chat')
};

export function showScreen(name) {
  Object.values(screens).forEach(el => el.classList.add('hidden'));
  screens[name].classList.remove('hidden');
  
  // Atualiza ícones Lucide quando a tela muda, se necessário
  if (window.lucide) {
    window.lucide.createIcons();
  }
}