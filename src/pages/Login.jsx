import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/supabaseClient';
import { Sword, Shield, BookOpen, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        if (data.user) {
          if (!rememberMe) {
            sessionStorage.setItem('temp_session', 'true');
            localStorage.setItem('remember_me', 'false');
          } else {
            localStorage.removeItem('remember_me');
          }
          navigate('/selecao');
        }
      } else {
        const { data, error } = await signUp(email, password, displayName);
        if (error) throw error;
        // Supabase signups might require email verification depending on settings,
        // but if auto-confirm is on, it logs them in immediately.
        if (data.user) {
          navigate('/selecao');
        } else {
          setError('Verifique seu e-mail para confirmar a conta.');
        }
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden text-neutral-200 font-sans">

      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      </div>

      <div className="w-full max-w-md relative z-10">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl mb-4 sm:mb-6 shadow-xl backdrop-blur-sm">
            <Sword className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 font-serif text-white">RollAngels</h1>
          <p className="text-neutral-400">Portal dos Aventureiros</p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 pb-2 text-sm font-medium transition-colors border-b-2 ${isLogin ? 'border-red-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 pb-2 text-sm font-medium transition-colors border-b-2 ${!isLogin ? 'border-red-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Nome de Usuário</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all font-mono text-sm"
                  placeholder="Seu nome ou apelido"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all font-mono text-sm"
                placeholder="aventureiro@lopeslindo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all font-mono text-sm"
                placeholder="••••••••"
              />
            </div>

            {isLogin && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-800 bg-neutral-950 text-red-600 focus:ring-red-500 focus:ring-offset-neutral-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-400 cursor-pointer">
                  Lembre-me neste navegador
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg px-4 py-2.5 mt-2 transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Iniciar Jornada' : 'Juntar-se à Guilda')}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
