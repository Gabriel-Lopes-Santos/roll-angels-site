import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCharacterProfile, updateAvatar, uploadAvatarFile, supabase } from '../lib/supabaseClient';
import { DEFAULT_SHEET_ACCENT, getSheetAccentFromUser } from '../lib/sheetTheme';
import { Loader2, ArrowLeft, Image as ImageIcon, Trash2, Check, X, User } from 'lucide-react';
import StatsTab from './tabs/StatsTab';
import ClasseTab from './tabs/ClasseTab';
import InventarioTab from './tabs/InventarioTab';
import MagiasTab from './tabs/MagiasTab';
import PersonaTab from './tabs/PersonaTab';
import SheetThemeSettingsModal from './SheetThemeSettingsModal';
import SiteSettingsDropdown from './SiteSettingsDropdown';

export default function CharacterSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('status');

  const [errorMsg, setErrorMsg] = useState('');

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const [sheetAccent, setSheetAccent] = useState(DEFAULT_SHEET_ACCENT);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);
  const [isSiteSettingsOpen, setIsSiteSettingsOpen] = useState(false);
  const siteSettingsRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setSheetAccent(getSheetAccentFromUser(session.user));
    })();
  }, []);

  /** Tema no documento: --sheet-accent + scrollbar; remove ao sair da ficha */
  useEffect(() => {
    if (!character) return undefined;
    const root = document.documentElement;
    const { body } = document;
    root.classList.add('sheet-themed-scroll');
    body.classList.add('sheet-themed-scroll');
    root.style.setProperty('--sheet-accent', sheetAccent);
    return () => {
      root.classList.remove('sheet-themed-scroll');
      body.classList.remove('sheet-themed-scroll');
      root.style.removeProperty('--sheet-accent');
    };
  }, [character, sheetAccent]);

  useEffect(() => {
    if (!isSiteSettingsOpen) return undefined;
    const close = (e) => {
      if (siteSettingsRef.current && !siteSettingsRef.current.contains(e.target)) {
        setIsSiteSettingsOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsSiteSettingsOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [isSiteSettingsOpen]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      const response = await getCharacterProfile(id);
      if (response.error) {
        setErrorMsg(response.error);
        setLoading(false);
        return;
      }
      setCharacter(response.data);
      setPreviewUrl(response.data.avatar);
      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleUpdateAvatar = async (remove = false) => {
    setIsSavingAvatar(true);

    if (remove) {
      const res = await updateAvatar(character.id, null);
      if (res.success) {
        setCharacter(prev => ({ ...prev, avatar: null }));
        setPreviewUrl(null);
        setSelectedFile(null);
        setIsAvatarModalOpen(false);
      } else alert("Erro ao remover a foto de perfil.");
    } else if (selectedFile) {
      const res = await uploadAvatarFile(character.id, selectedFile);
      if (res.success) {
        setCharacter(prev => ({ ...prev, avatar: res.data.avatar_url }));
        setPreviewUrl(res.data.avatar_url);
        setSelectedFile(null);
        setIsAvatarModalOpen(false);
      } else alert("Erro ao enviar a imagem.");
    }

    setIsSavingAvatar(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const tabs = [
    { id: 'status', label: 'STATUS', icon: 'analytics' },
    { id: 'classe', label: 'CLASSE', icon: 'account_tree' },
    { id: 'persona', label: 'PERSONA', icon: 'person' },
    { id: 'inventario', label: 'INVENTÁRIO', icon: 'inventory_2' },
    { id: 'magias', label: 'GRIMÓRIO', icon: 'auto_stories' },
    { id: 'missoes', label: 'MISSÕES', icon: 'explore' },
    { id: 'log', label: 'LOG', icon: 'book' },
  ];

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-primary">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (errorMsg) return <div className="flex h-screen w-full items-center justify-center p-8 text-center text-error font-serif text-2xl">{errorMsg}</div>;
  if (!character) return <div className="p-8 text-center text-error">Falha ao carregar personagem.</div>;

  // Sub-raça já vem em pt-br do perfil; se existir, mostra só ela (evita "Draconato Draconato Cromático").
  const sub = typeof character.sub_race === 'string' ? character.sub_race.trim() : '';
  const displayRace = sub ? sub : (character.race || 'SEM RAÇA');

  return (
    <div className="min-h-screen bg-background text-on-surface">

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-container flex justify-between items-center px-4 md:px-6 h-16 shadow-none border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/selecao')}
            className="flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors mr-2"
          >
            <ArrowLeft className="w-6 h-6 text-sheet-accent" />
          </button>
          <div
            onClick={() => { setIsAvatarModalOpen(true); setPreviewUrl(character.avatar); }}
            className="h-10 w-10 rounded-full overflow-hidden border-2 border-sheet-accent cursor-pointer hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center bg-surface-container-highest"
            title="Alterar Foto de Perfil"
          >
            {character.avatar ? (
              <img alt={`${character.name} Portrait`} className="w-full h-full object-cover" src={character.avatar} />
            ) : (
              <User className="w-6 h-6 text-on-surface-variant/40" />
            )}
          </div>
          <div>
            <h1 className="font-['Space_Grotesk'] text-lg font-black tracking-tighter text-sheet-accent leading-none uppercase">{character.name}</h1>
            <div className="flex gap-2 text-[10px] font-bold tracking-widest uppercase opacity-60 whitespace-nowrap">
              <span>{character.class || 'SEM CLASSE'}</span>
              <span className="text-sheet-accent opacity-100">•</span>
              <span>{displayRace}</span>
              <span className="text-sheet-accent opacity-100">•</span>
              <span>Lvl {character.level || 1}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-6 font-['Space_Grotesk'] text-xs font-bold tracking-widest uppercase text-neutral-400">
            <button type="button" className="hover:text-sheet-accent transition-colors">Histórico</button>
            <button type="button" className="hover:text-sheet-accent transition-colors">Mensagens</button>
          </div>

          <div className="flex items-center gap-3 text-neutral-400">
            <button type="button" className="hover:text-sheet-accent transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <div className="relative" ref={siteSettingsRef}>
              <button
                type="button"
                onClick={() => setIsSiteSettingsOpen((o) => !o)}
                className={`hover:text-sheet-accent transition-colors flex items-center justify-center rounded-full p-1 ${isSiteSettingsOpen ? 'text-sheet-accent bg-white/5' : ''}`}
                title="Configurações"
                aria-expanded={isSiteSettingsOpen}
                aria-haspopup="menu"
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </button>
              {isSiteSettingsOpen && (
                <SiteSettingsDropdown
                  onEditTheme={() => setIsThemeSettingsOpen(true)}
                  onClose={() => setIsSiteSettingsOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar (Desktop Only) */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-white/5 bg-background hidden md:flex flex-col py-4 z-40">
        <nav className="flex-1 mt-4 space-y-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-6 py-3 font-['Space_Grotesk'] text-xs font-bold tracking-widest uppercase transition-all duration-300
                  ${isActive
                    ? 'bg-surface-container-high text-sheet-accent border-l-4 border-sheet-accent'
                    : 'text-neutral-400 hover:bg-surface-container hover:text-sheet-accent border-l-4 border-transparent'
                  }`}
              >
                <span className="material-symbols-outlined">{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="mt-16 pb-20 md:pb-8 md:pl-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'status' && <StatsTab character={character} />}
        {activeTab === 'classe' && <ClasseTab character={character} />}
        {activeTab === 'persona' && <PersonaTab character={character} />}
        {activeTab === 'inventario' && <InventarioTab character={character} />}
        {activeTab === 'magias' && <MagiasTab character={character} />}

        {activeTab === 'missoes' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 mt-8">
            <div className="flex justify-between items-end border-b border-white/5 pb-4">
              <div>
                <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] text-sheet-accent-weak uppercase">Objetivos</p>
                <h3 className="font-['Space_Grotesk'] text-3xl font-black">MISSÕES</h3>
              </div>
            </div>
            <div className="bg-surface-container p-8 rounded border border-outline-variant/10 text-center text-sheet-accent-faint font-['Space_Grotesk'] tracking-widest uppercase text-sm">
              Aba de missões em construção
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-4">
              <div>
                <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] text-sheet-accent-weak uppercase">Mundo e Aventuras</p>
                <h3 className="font-['Space_Grotesk'] text-3xl font-black">DIÁRIO DE JOGO</h3>
              </div>
            </div>

            <div className="bg-surface-container p-6 rounded border border-outline-variant/10">
              <textarea
                className="w-full min-h-[150px] bg-surface-container-lowest text-on-surface p-4 rounded outline-none border border-white/5 focus:border-sheet-accent-soft transition-colors resize-y text-sm font-['Inter'] leading-relaxed placeholder-sheet-accent-faint"
                placeholder="Insira notas, acontecimentos ou informações importantes da sessão..."
              ></textarea>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  className="bg-sheet-accent-subtle hover:bg-sheet-accent-muted text-sheet-accent border border-sheet-accent-soft px-6 py-2 rounded text-xs font-bold font-['Space_Grotesk'] tracking-widest uppercase transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Adicionar Bloco
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs font-bold text-sheet-accent-weak tracking-widest uppercase font-['Space_Grotesk']">Registros Anteriores</p>
              <div className="bg-surface-container-highest p-6 rounded border-l-2 border-sheet-accent relative group">
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Espaço reservado para carregar os blocos do diário que foram salvos anteriormente.
                </p>
                <span className="absolute top-4 right-4 text-[10px] text-on-surface-variant/30 font-mono tracking-widest">HOJE</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 w-full z-50 bg-background/80 backdrop-blur-xl border-t border-white/5 flex justify-around items-center h-16 px-2 md:hidden">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center scale-100 active:scale-90 transition-transform w-20
                ${isActive ? 'text-sheet-accent' : 'text-neutral-400 hover:text-sheet-accent'}`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "" }}>
                {tab.icon}
              </span>
              <span className="font-['Inter'] text-[10px] uppercase tracking-widest font-semibold mt-1">
                {tab.label.substring(0, 6)}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Modal de Foto de Perfil */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setIsAvatarModalOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-['Space_Grotesk'] text-xl font-black text-primary mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              FOTO DE PERFIL
            </h3>

            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/50 shadow-lg relative group bg-surface-container-highest flex justify-center items-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                  />
                ) : (
                  <User className="w-16 h-16 text-on-surface-variant/40" />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold tracking-widest text-on-surface-variant/60 uppercase font-['Space_Grotesk'] mb-2 block">Upload da Imagem</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full bg-surface-container-lowest border border-white/10 rounded p-3 text-sm flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors">
                    <ImageIcon className="w-5 h-5 text-on-surface-variant/50" />
                    <span className="text-on-surface-variant/70 font-semibold truncate text-xs">
                      {selectedFile ? selectedFile.name : "Clique aqui para Selecionar"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleUpdateAvatar(false)}
                  disabled={isSavingAvatar || !selectedFile}
                  className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-3 rounded font-bold uppercase tracking-widest text-xs flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSavingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar Imagem
                </button>
                <button
                  onClick={() => handleUpdateAvatar(true)}
                  disabled={isSavingAvatar || (!character.avatar && !previewUrl)}
                  className="w-full hover:bg-error/10 text-error py-2 rounded font-bold uppercase tracking-widest text-xs flex justify-center items-center gap-2 transition-colors disabled:opacity-50 border border-transparent hover:border-error/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SheetThemeSettingsModal
        open={isThemeSettingsOpen}
        onClose={() => setIsThemeSettingsOpen(false)}
        currentAccent={sheetAccent}
        onSaved={(accent) => setSheetAccent(accent)}
      />

    </div>
  );
}
