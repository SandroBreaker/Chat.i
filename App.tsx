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
    // Check for config first
    const config = getSupabaseConfig();
    if (!config) {
      setHasConfig(false);
      setLoading(false);
      return;
    }
    setHasConfig(true);

    const supabase = getSupabase();
    if (!supabase) return;

    const auth = supabase.auth as any;

    // Check active session (compatible with v1 and v2)
    const checkSession = async () => {
      if (auth.getSession) {
        // v2
        const { data } = await auth.getSession();
        setSession(data?.session ?? null);
      } else if (auth.session) {
        // v1
        setSession(auth.session());
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const {
      data
    } = auth.onAuthStateChange((_event: string, session: any) => {
      setSession(session);
    });

    return () => {
      // Clean up subscription (compatible with v1 and v2)
      if (data?.subscription) {
        data.subscription.unsubscribe();
      } else if (data?.unsubscribe) {
        data.unsubscribe();
      } else if (typeof data === 'object' && data !== null && 'unsubscribe' in data) {
         (data as any).unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-100">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Iniciando WhatsChat...</p>
        <div className="mt-8 text-xs text-gray-400 flex items-center gap-2">
          <span className="w-4 h-4 text-emerald-600">🔒</span>
          End-to-end encrypted
        </div>
      </div>
    );
  }

  if (!hasConfig) {
    return <ConfigScreen />;
  }

  return (
    <div className="h-full">
      {!session ? (
        <Auth />
      ) : (
        <ChatInterface sessionUser={session.user} />
      )}
    </div>
  );
};

export default App;