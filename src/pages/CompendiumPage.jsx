import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLexicon } from '../context/LexiconContext';
import { searchCodexEntries, CODEX_CATEGORIES, getCodexEntry } from '../lib/lexiconClient';
import LexiconText from '../components/lexicon/LexiconText';
import { getCategoryIcon, getCategoryBadgeStyle } from '../components/lexicon/NestedTooltipPortal';
import {
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Layers,
  ExternalLink,
  Share2,
} from 'lucide-react';

export default function CompendiumPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { entries, loading } = useLexicon();

  const termParam = searchParams.get('termo');
  const catParam = searchParams.get('categoria') || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(catParam);
  const [activeEntry, setActiveEntry] = useState(null);
  const searchInputRef = useRef(null);

  // Inicializa a partir dos searchParams
  useEffect(() => {
    if (termParam) {
      const found = getCodexEntry(termParam);
      if (found) {
        setActiveEntry(found);
      } else {
        setSearchQuery(termParam);
      }
    }
  }, [termParam, entries]);

  // Resultados filtrados
  const results = useMemo(() => {
    return searchCodexEntries(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory, entries]);

  // Seleciona o primeiro resultado automaticamente no desktop se nenhum estiver ativo
  useEffect(() => {
    if (!activeEntry && results.length > 0 && window.innerWidth >= 1024) {
      setActiveEntry(results[0]);
    }
  }, [results, activeEntry]);

  const handleSelectEntry = (entry) => {
    setActiveEntry(entry);
    setSearchParams({ termo: entry.slug || entry.entry_id, categoria: selectedCategory });
  };

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setSearchParams({ categoria: catId, ...(searchQuery ? { busca: searchQuery } : {}) });
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* Top Bar */}
      <header className="fixed top-0 w-full z-40 bg-surface-container/85 backdrop-blur-xl border-b border-white/5 h-16 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-sheet-accent hover:bg-white/10 rounded-full transition-colors active:scale-95"
            title="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sheet-accent/20 border border-sheet-accent/40 flex items-center justify-center text-sheet-accent">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-['Space_Grotesk'] text-lg font-black tracking-tight uppercase text-sheet-accent leading-none">
                Compêndio & Codex
              </h1>
              <p className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-widest mt-0.5">
                D&D 5e • Dicionário e Enciclopédia
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-on-surface-variant/40 hidden md:block">
          {entries.length} verbetes indexados
        </div>
      </header>

      {/* Main Layout: 2 Colunas no Desktop */}
      <div className="mt-16 flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Coluna Esquerda: Busca, Filtros e Lista */}
        <div className={`w-full lg:w-[420px] flex flex-col shrink-0 space-y-4 ${activeEntry && 'hidden lg:flex'}`}>
          {/* Caixa de Busca */}
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-3.5 text-on-surface-variant/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, tipo, regra..."
              className="w-full h-12 pl-11 pr-11 bg-surface-container border border-white/10 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-sheet-accent focus:ring-1 focus:ring-sheet-accent transition-all font-['Inter']"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant/50 hover:text-white rounded-full transition-colors active:scale-90"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chips de Categoria com rolagem horizontal */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {CODEX_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-['Space_Grotesk'] font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 border active:scale-95 ${
                    isSelected
                      ? 'bg-sheet-accent text-on-sheet-accent border-sheet-accent shadow-md'
                      : 'bg-surface-container text-on-surface-variant hover:text-white border-white/5 hover:border-white/10'
                  }`}
                >
                  {getCategoryIcon(cat.id, 'w-3.5 h-3.5')}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Lista de Itens com scroll */}
          <div className="flex-1 bg-surface-container/60 border border-white/5 rounded-2xl p-2 max-h-[calc(100vh-16rem)] overflow-y-auto divide-y divide-white/5">
            {results.length === 0 ? (
              <div className="py-16 text-center text-on-surface-variant/40 font-['Space_Grotesk'] space-y-2">
                <Search className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-sm font-bold uppercase tracking-wider">Nenhum verbete encontrado</p>
                <p className="text-xs font-normal">Verifique o termo digitado ou altere o filtro de categoria.</p>
              </div>
            ) : (
              results.map((entry) => {
                const isActive = activeEntry?.entry_id === entry.entry_id;
                return (
                  <div
                    key={entry.entry_id}
                    onClick={() => handleSelectEntry(entry)}
                    className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-surface-container-high border-l-4 border-sheet-accent text-sheet-accent'
                        : 'hover:bg-white/5 text-on-surface'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${getCategoryBadgeStyle(
                          entry.category
                        )}`}
                      >
                        {getCategoryIcon(entry.category, 'w-3.5 h-3.5')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-['Space_Grotesk'] text-sm font-bold truncate">
                            {entry.name_pt || entry.name}
                          </h2>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getCategoryBadgeStyle(
                              entry.category
                            )}`}
                          >
                            {entry.badge_label}
                          </span>
                        </div>
                        {entry.short_desc && (
                          <p className="text-xs text-on-surface-variant/60 line-clamp-1 mt-0.5">
                            {entry.short_desc}
                          </p>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? 'text-sheet-accent translate-x-1' : 'text-on-surface-variant/30'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Leitor do Verbete Selecionado */}
        <div className={`flex-1 ${!activeEntry && 'hidden lg:block'}`}>
          {activeEntry ? (
            <div className="bg-surface-container/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl sticky top-20">
              {/* Botão voltar no mobile */}
              <div className="lg:hidden flex items-center justify-between pb-3 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveEntry(null)}
                  className="min-h-[44px] flex items-center gap-2 text-sheet-accent font-['Space_Grotesk'] font-bold text-xs uppercase"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar à Lista
                </button>
              </div>

              {/* Badges e Categoria */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${getCategoryBadgeStyle(
                    activeEntry.category
                  )}`}
                >
                  {getCategoryIcon(activeEntry.category, 'w-4 h-4')}
                  <span>{activeEntry.badge_label}</span>
                </span>

                <div className="flex items-center gap-2">
                  {activeEntry.campaign_id ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Campanha
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-on-surface-variant/80 border border-white/5">
                      D&D 5e Oficial
                    </span>
                  )}
                </div>
              </div>

              {/* Títulos */}
              <div>
                <h2 className="font-['Space_Grotesk'] text-3xl md:text-4xl font-black text-on-surface uppercase tracking-tight">
                  {activeEntry.name_pt || activeEntry.name}
                </h2>
                {activeEntry.name && activeEntry.name_pt && activeEntry.name !== activeEntry.name_pt && (
                  <p className="text-sm text-on-surface-variant/60 font-mono mt-1">
                    Nome Original (Inglês): {activeEntry.name}
                  </p>
                )}
                {activeEntry.short_desc && (
                  <p className="text-sm font-medium text-sheet-accent/80 italic mt-2">
                    {activeEntry.short_desc}
                  </p>
                )}
              </div>

              {/* Ficha técnica de parâmetros especiais */}
              {activeEntry.extra_data && Object.keys(activeEntry.extra_data).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-surface-container-high/60 border border-white/5 text-xs font-mono">
                  {activeEntry.extra_data.level !== undefined && (
                    <div>
                      <span className="text-on-surface-variant/50 block text-[10px] uppercase">Círculo / Nível</span>
                      <span className="font-bold text-on-surface">
                        {activeEntry.extra_data.level === 0 ? 'Truque' : `${activeEntry.extra_data.level}º Círculo`}
                      </span>
                    </div>
                  )}
                  {activeEntry.extra_data.school_pt && (
                    <div>
                      <span className="text-on-surface-variant/50 block text-[10px] uppercase">Escola de Magia</span>
                      <span className="font-bold text-on-surface">{activeEntry.extra_data.school_pt}</span>
                    </div>
                  )}
                  {activeEntry.extra_data.casting_time && (
                    <div>
                      <span className="text-on-surface-variant/50 block text-[10px] uppercase">Conjuração</span>
                      <span className="font-bold text-on-surface">{activeEntry.extra_data.casting_time}</span>
                    </div>
                  )}
                  {activeEntry.extra_data.range && (
                    <div>
                      <span className="text-on-surface-variant/50 block text-[10px] uppercase">Alcance</span>
                      <span className="font-bold text-on-surface">{activeEntry.extra_data.range}</span>
                    </div>
                  )}
                  {activeEntry.extra_data.duration && (
                    <div>
                      <span className="text-on-surface-variant/50 block text-[10px] uppercase">Duração</span>
                      <span className="font-bold text-on-surface">
                        {activeEntry.extra_data.concentration ? 'Concentração, ' : ''}
                        {activeEntry.extra_data.duration}
                      </span>
                    </div>
                  )}
                  {activeEntry.extra_data.hit_die && (
                    <div>
                      <span className="text-on-surface-variant/50 block text-[10px] uppercase">Dado de Vida</span>
                      <span className="font-bold text-on-surface">d{activeEntry.extra_data.hit_die}</span>
                    </div>
                  )}
                  {activeEntry.extra_data.weight && (
                    <div>
                      <span className="text-on-surface-variant/50 block text-[10px] uppercase">Peso</span>
                      <span className="font-bold text-on-surface">{activeEntry.extra_data.weight} kg</span>
                    </div>
                  )}
                  {activeEntry.extra_data.cost_value && (
                    <div>
                      <span className="text-on-surface-variant/50 block text-[10px] uppercase">Valor Estimado</span>
                      <span className="font-bold text-on-surface">
                        {activeEntry.extra_data.cost_value} {activeEntry.extra_data.cost_unit || 'po'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Descrição Detalhada com Nested Tooltips ativos */}
              <div className="border-t border-white/5 pt-6 text-sm md:text-base leading-relaxed text-on-surface/90 space-y-4 font-['Inter']">
                <LexiconText
                  text={activeEntry.description || activeEntry.short_desc || 'Sem detalhes adicionais.'}
                  excludeEntryId={activeEntry.entry_id}
                />
              </div>

              {/* Sinônimos e termos indexados */}
              {activeEntry.synonyms && activeEntry.synonyms.length > 0 && (
                <div className="border-t border-white/5 pt-4">
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant/40 block mb-1.5">
                    Termos e Gatilhos de Busca:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeEntry.synonyms.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-surface-container-highest rounded-md text-[11px] font-mono text-on-surface-variant/70 border border-white/5"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-surface-container/30 border border-dashed border-white/10 rounded-2xl text-center text-on-surface-variant/40 space-y-3">
              <BookOpen className="w-12 h-12 opacity-30" />
              <p className="font-['Space_Grotesk'] text-base font-bold uppercase tracking-wider">
                Selecione um verbete para visualizar
              </p>
              <p className="text-xs max-w-sm">
                Explore regras, magias, talentos, itens e condições oficiais do sistema D&D 5e e da sua campanha.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
