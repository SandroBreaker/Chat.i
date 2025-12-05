import { state } from './state.js';

export function loadConfig() {
    // Credenciais hardcoded para evitar tela de configuração
    const DEFAULT_URL = "https://qvkfoitbatyrwqbicwwc.supabase.co";
    const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2ZvaXRiYXR5cndxYmljd3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjE5NjMsImV4cCI6MjA3OTIzNzk2M30.YzaC8z3e3ut6FFiNsr4e-NJtcVQvvLX-QuOKtjd78YM";
    
    state.config = { url: DEFAULT_URL, key: DEFAULT_KEY };
}

// Função vazia pois removemos o form de config
export function setupConfigListeners() {}
