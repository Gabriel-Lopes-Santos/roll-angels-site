import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getUserCharacters, signOut } from '../lib/supabaseClient';
import { LogOut, User, Shield, Loader2 } from 'lucide-react';

export default function CharacterSelection() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }
      
      const rememberMe = localStorage.getItem('remember_me');
      const tempSession = sessionStorage.getItem('temp_session');
      
      if (rememberMe === 'false' && !tempSession) {
        await signOut();
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      const { data: chars, error } = await getUserCharacters(session.user.id);
      
      if (chars) {
        setCharacters(chars);
      }
      setLoading(false);
    };

    checkAuthAndLoad();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-purple-500">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-4 sm:p-8 relative overflow-hidden">
      
      {/* Background Decorativo */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Seus Personagens</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Conectado como <span className="text-purple-400 font-medium">{user?.user_metadata?.display_name || user?.email}</span>
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair da Taverna
          </button>
        </header>

        {/* Character Grid */}
        {characters.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/30 border border-neutral-800/50 rounded-2xl border-dashed">
            <User className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum aventureiro encontrado</h3>
            <p className="text-neutral-500">O Mestre da mesa ainda não vinculou nenhuma ficha a essa conta.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map(char => (
              <div 
                key={char.id}
                onClick={() => navigate(`/ficha/${char.id}`)}
                className="group relative bg-neutral-900/60 border border-neutral-800 hover:border-purple-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-2xl hover:shadow-purple-900/10 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-950/80 pointer-events-none"></div>
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700 overflow-hidden">
                    {/* Placeholder Avatar - Idealmente viria do banco de dados futuramente */}
                    <User className="w-8 h-8 text-neutral-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                      {char.name || 'Sem Nome'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center rounded-md bg-neutral-800/50 px-2 py-1 text-xs font-medium text-neutral-300 ring-1 ring-inset ring-neutral-700/50">
                        Nível {char.level || 1}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-purple-900/20 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-900/30">
                        {char.className}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2 truncate">
                      {char.raceName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
