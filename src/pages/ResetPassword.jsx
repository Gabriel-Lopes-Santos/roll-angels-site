import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, updatePassword } from '../lib/supabaseClient';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import bgImage from '../assets/login-bg.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  // O Supabase precisa processar o hash da URL antes de podermos atualizar a senha.
  // 'ready' fica true quando o evento PASSWORD_RECOVERY é detectado.
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    // O SDK do Supabase lê automaticamente os tokens do hash da URL (#access_token=...&type=recovery)
    // e dispara o evento PASSWORD_RECOVERY no onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Se após 5 segundos o evento não veio, o link provavelmente é inválido/expirado.
    const timeout = setTimeout(() => {
      setInvalidLink(prev => !ready && !prev ? true : prev);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      setSuccess(true);
      // Redireciona para login após 3 segundos
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a senha. Tente novamente.');
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
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm sm:backdrop-blur-none"></div>
      <div className="absolute inset-x-0 bottom-0 z-0 h-1/2 bg-gradient-to-t from-zinc-950 to-transparent"></div>

      <div className="w-full max-w-md relative z-10">

        {/* Título */}
        <div className="text-center mb-8 drop-shadow-2xl">
          <h1
            className="text-3xl sm:text-5xl font-black mb-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            style={{ fontFamily: "'Nunito', 'Quicksand', sans-serif" }}
          >
            ROLL <span className="text-purple-500">ANGELS</span>
          </h1>
          <p className="text-neutral-300 font-medium tracking-widest uppercase text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Redefinição de Senha
          </p>
        </div>

        <div className="bg-zinc-950/70 border border-purple-900/40 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent opacity-80"></div>

          {/* ── Estado: Sucesso ── */}
          {success && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ShieldCheck className="w-14 h-14 text-emerald-400" />
              <p className="text-emerald-400 font-bold text-lg">Senha redefinida!</p>
              <p className="text-neutral-400 text-sm">
                Sua senha foi atualizada com sucesso. Redirecionando para o login...
              </p>
            </div>
          )}

          {/* ── Estado: Link inválido/expirado ── */}
          {!success && invalidLink && !ready && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertTriangle className="w-14 h-14 text-yellow-400" />
              <p className="text-yellow-400 font-bold text-lg">Link inválido ou expirado</p>
              <p className="text-neutral-400 text-sm">
                Este link de recuperação não é mais válido. Solicite um novo link na tela de login.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg px-6 py-2.5 transition-colors text-sm"
              >
                Voltar ao Login
              </button>
            </div>
          )}

          {/* ── Estado: Carregando/aguardando token ── */}
          {!success && !invalidLink && !ready && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
              <p className="text-neutral-400 text-sm">Verificando link de recuperação...</p>
            </div>
          )}

          {/* ── Estado: Formulário ── */}
          {!success && ready && (
            <>
              <h2 className="text-lg font-bold text-white mb-1">Nova Senha</h2>
              <p className="text-sm text-neutral-400 mb-5">
                Escolha uma nova senha para a sua conta.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">
                    Nova Senha
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-mono text-sm"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-mono text-sm"
                    placeholder="Repita a senha"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg px-4 py-2.5 mt-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Redefinir Senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
