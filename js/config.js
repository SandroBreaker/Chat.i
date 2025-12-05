import { state } from './state.js';

export function loadConfig() {
  const stored = localStorage.getItem('supabase-config');
  if (stored) {
    state.config = JSON.parse(stored);
  } else {
    // Default fallback credentials
    const DEFAULT_URL = "https://qvkfoitbatyrwqbicwwc.supabase.co";
    const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2ZvaXRiYXR5cndxYmljd3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjE5NjMsImV4cCI6MjA3OTIzNzk2M30.YzaC8z3e3ut6FFiNsr4e-NJtcVQvvLX-QuOKtjd78YM";
    if(DEFAULT_URL && DEFAULT_KEY) {
        state.config = { url: DEFAULT_URL, key: DEFAULT_KEY };
    }
  }
}

export function setupConfigListeners() {
  const form = document.getElementById('config-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('config-url').value;
      const key = document.getElementById('config-key').value;
      
      if (url && key) {
        const config = { url, key };
        localStorage.setItem('supabase-config', JSON.stringify(config));
        window.location.reload();
      }
    });
  }
}