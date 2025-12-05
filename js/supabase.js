import { createClient } from '@supabase/supabase-js';
import { state } from './state.js';

export function initializeSupabase() {
  if (!state.config) return;
  state.supabase = createClient(state.config.url, state.config.key);
}