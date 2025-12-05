import React, { useEffect, useState } from 'react';
import { getSupabase, getSupabaseConfig } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { ChatInterface } from './components/ChatInterface';
import { ConfigScreen } from './components/ConfigScreen';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config) { setHasConfig(false); setLoading(false); return; }
    setHasConfig(true);
    const supabase = getSupabase();
    if (!supabase) return;
    const auth = supabase.auth as any;
    
    const checkSession = async () => {
      if (auth.getSession) { const { data } = await auth.getSession(); setSession(data?.session ?? null); }
      else if (auth.session) { setSession(auth.session()); }
      setLoading(false);
    };
    checkSession();
    auth.onAuthStateChange((_ev: any, sess: any) => setSession(sess));
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600 w-10 h-10"/></div>;
  if (!hasConfig) return <ConfigScreen />;
  return session ? <ChatInterface sessionUser={session.user} /> : <Auth />;
};
export default App;
