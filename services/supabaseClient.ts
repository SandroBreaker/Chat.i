import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

// Credenciais fornecidas para configuração automática
const DEFAULT_URL = "https://qvkfoitbatyrwqbicwwc.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2ZvaXRiYXR5cndxYmljd3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjE5NjMsImV4cCI6MjA3OTIzNzk2M30.YzaC8z3e3ut6FFiNsr4e-NJtcVQvvLX-QuOKtjd78YM";

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseConfig = (): SupabaseConfig | null => {
  const stored = localStorage.getItem('supabase-config');
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Verifica variáveis de ambiente
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_ANON_KEY
    };
  }

  // Fallback para as credenciais fornecidas no prompt
  if (DEFAULT_URL && DEFAULT_KEY) {
    return {
      url: DEFAULT_URL,
      key: DEFAULT_KEY
    };
  }

  return null;
};

export const saveSupabaseConfig = (config: SupabaseConfig) => {
  localStorage.setItem('supabase-config', JSON.stringify(config));
  // Re-initialize client
  supabaseInstance = createClient(config.url, config.key);
  window.location.reload(); // Simple reload to reset app state with new config
};

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const config = getSupabaseConfig();
  if (config) {
    supabaseInstance = createClient(config.url, config.key);
    return supabaseInstance;
  }
  
  return null;
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase-config');
  supabaseInstance = null;
  window.location.reload();
};