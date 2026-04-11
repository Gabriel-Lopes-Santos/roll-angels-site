import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import bgImage from '../assets/login-bg.png';

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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden text-neutral-200 font-sans"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay Escuro para dar destaque ao Card de Login */}
      <div className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm sm:backdrop-blur-none"></div>

      {/* Gradiente Inferior para Drama */}
      <div className="absolute inset-x-0 bottom-0 z-0 h-1/2 bg-gradient-to-t from-zinc-950 to-transparent"></div>

      <div className="w-full max-w-md relative z-10">

        <div className="text-center mb-8 drop-shadow-2xl">
          <h1 
            className="text-3xl sm:text-5xl font-black mb-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{ fontFamily: "'Nunito', 'Quicksand', sans-serif" }}
          >
            ROLL <span className="text-purple-500">ANGELS</span>
          </h1>
          <p className="text-neutral-300 font-medium tracking-widest uppercase text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Portal dos Aventureiros</p>
        </div>

        <div className="bg-zinc-950/70 border border-purple-900/40 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Efeito Sangrento no Borda Superior */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent opacity-80"></div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 pb-2 text-sm font-medium transition-colors border-b-2 ${isLogin ? 'border-purple-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 pb-2 text-sm font-medium transition-colors border-b-2 ${!isLogin ? 'border-purple-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-sm">
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
                  className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-sm"
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
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-sm"
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
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-sm"
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
                  className="h-4 w-4 rounded border-neutral-800 bg-neutral-950 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-neutral-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-400 cursor-pointer">
                  Lembre-me neste navegador
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg px-4 py-2.5 mt-2 transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Iniciar Jornada' : 'Juntar-se à Guilda')}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
