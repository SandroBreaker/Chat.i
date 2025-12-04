import React, { useState } from 'react';
import { getSupabase } from '../services/supabaseClient';
import { MessageSquare, Loader2, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);

    const auth = supabase.auth as any;

    try {
      if (isLogin) {
        // Handle both v2 (signInWithPassword) and v1 (signIn)
        const { error } = auth.signInWithPassword 
          ? await auth.signInWithPassword({ email, password })
          : await auth.signIn({ email, password });
        
        if (error) throw error;
      } else {
        const result = await auth.signUp({
          email,
          password,
        });
        
        const authError = result.error;
        // v2 returns data.user, v1 returns user directly
        const user = result.data?.user || result.user;

        if (authError) throw authError;

        if (user) {
          // Create profile in profilesMSP table
          const { error: profileError } = await supabase.from('profilesMSP').insert([
            {
              id: user.id,
              email: email,
              username: username || email.split('@')[0],
              avatar_url: `https://ui-avatars.com/api/?name=${username || email}&background=random`
            },
          ]);
          if (profileError) {
             console.error("Profile creation failed", profileError);
             // Non-blocking, but good to know
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start pt-20 sm:justify-center sm:pt-0">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-emerald-600 p-6 flex flex-col items-center">
          <MessageSquare className="text-white w-12 h-12 mb-2" />
          <h2 className="text-2xl font-bold text-white">WhatsChat</h2>
          <p className="text-emerald-100 text-sm">Conecte-se com o mundo</p>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            {isLogin ? 'Entrar na sua conta' : 'Criar nova conta'}
          </h3>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome de Usuário</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Seu nome"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {isLogin ? 'Entrar' : 'Cadastrar'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-emerald-600 hover:text-emerald-500 font-medium"
            >
              {isLogin ? 'Não tem conta? Crie uma agora' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};