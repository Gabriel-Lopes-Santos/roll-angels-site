import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLexicon } from '../../context/LexiconContext';
import { searchCodexEntries, CODEX_CATEGORIES } from '../../lib/lexiconClient';
import LexiconText from './LexiconText';
import { getCategoryIcon, getCategoryBadgeStyle } from './NestedTooltipPortal';
import {
  Search,
  X,
  ChevronRight,
  ExternalLink,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';

export default function CompendiumDrawer() {
  const {
    isDrawerOpen,
    closeCompendium,
    drawerInitialSearch,
    selectedEntry,
    setSelectedEntry,
  } = useLexicon();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeEntry, setActiveEntry] = useState(null);
  const inputRef = useRef(null);

  // Sincroniza busca inicial quando o drawer abre
  useEffect(() => {
    if (isDrawerOpen) {
      if (drawerInitialSearch) {
        setSearchQuery(drawerInitialSearch);
      }
      if (selectedEntry) {
        setActiveEntry(selectedEntry);
      }
      setTimeout(() => {
        if (!selectedEntry && inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      setActiveEntry(null);
    }
  }, [isDrawerOpen, drawerInitialSearch, selectedEntry]);

  // Resultados filtrados
  const results = useMemo(() => {
    return searchCodexEntries(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  if (!isDrawerOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeCompendium}
      />

      {/* Painel Lateral (Drawer) */}
      <div className="relative w-full max-w-xl h-full bg-[#131116]/95 backdrop-blur-3xl border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.85)] flex flex-col animate-in slide-in-from-right duration-250 z-10 text-on-surface overflow-hidden">
        {/* Traço de Brilho Arcano na borda esquerda */}
        <div className="absolute top-0 bottom-0 left-0 w-[1.5px] bg-gradient-to-b from-transparent via-sheet-accent/50 to-transparent pointer-events-none" />

        {/* Cabeçalho do Drawer */}
        <header className="p-4 md:p-5 border-b border-white/5 flex items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            {activeEntry ? (
              <button
                type="button"
                onClick={() => setActiveEntry(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-sheet-accent hover:bg-white/5 rounded-full transition-colors active:scale-95"
                title="Voltar à lista"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sheet-accent/15 border border-sheet-accent/30 flex items-center justify-center text-sheet-accent shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="font-['Space_Grotesk'] text-base md:text-lg font-black tracking-tight uppercase text-sheet-accent">
                {activeEntry ? (activeEntry.name_pt || activeEntry.name) : 'Compêndio de Regras'}
              </h2>
              <p className="text-[10px] font-mono tracking-widest text-on-surface-variant/50 uppercase">
                {activeEntry ? `${activeEntry.badge_label} • D&D 5e` : `${results.length} verbetes disponíveis`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeCompendium}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/5 rounded-full transition-colors active:scale-95"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Corpo do Drawer: Detalhe do Verbete OU Lista de Busca */}
        {activeEntry ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 leading-relaxed">
            {/* Categoria e Badges */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/5">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${getCategoryBadgeStyle(
                  activeEntry.category
                )}`}
              >
                {getCategoryIcon(activeEntry.category, 'w-3.5 h-3.5')}
                <span>{activeEntry.badge_label}</span>
              </span>

              {activeEntry.campaign_id ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Campanha
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-on-surface-variant/70">
                  SRD 5e Oficial
                </span>
              )}
            </div>

            {/* Título Principal */}
            <div>
              <h1 className="font-['Space_Grotesk'] text-2xl font-black text-on-surface uppercase">
                {activeEntry.name_pt || activeEntry.name}
              </h1>
              {activeEntry.name && activeEntry.name_pt && activeEntry.name !== activeEntry.name_pt && (
                <p className="text-xs text-on-surface-variant/60 font-mono mt-0.5">
                  Original (EN): {activeEntry.name}
                </p>
              )}
            </div>

            {/* Parâmetros Especiais da Categoria (Magias, Itens, etc.) */}
            {activeEntry.extra_data && Object.keys(activeEntry.extra_data).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-xs font-mono shadow-xs">
                {activeEntry.extra_data.level !== undefined && (
                  <div>
                    <span className="text-on-surface-variant/50 block text-[10px] uppercase">Nível:</span>
                    <span className="font-bold text-on-surface">
                      {activeEntry.extra_data.level === 0 ? 'Truque' : `${activeEntry.extra_data.level}º Círculo`}
                    </span>
                  </div>
                )}
                {activeEntry.extra_data.school_pt && (
                  <div>
                    <span className="text-on-surface-variant/50 block text-[10px] uppercase">Escola:</span>
                    <span className="font-bold text-on-surface">{activeEntry.extra_data.school_pt}</span>
                  </div>
                )}
                {activeEntry.extra_data.casting_time && (
                  <div>
                    <span className="text-on-surface-variant/50 block text-[10px] uppercase">Tempo de Conjuração:</span>
                    <span className="font-bold text-on-surface">{activeEntry.extra_data.casting_time}</span>
                  </div>
                )}
                {activeEntry.extra_data.range && (
                  <div>
                    <span className="text-on-surface-variant/50 block text-[10px] uppercase">Alcance:</span>
                    <span className="font-bold text-on-surface">{activeEntry.extra_data.range}</span>
                  </div>
                )}
                {activeEntry.extra_data.duration && (
                  <div>
                    <span className="text-on-surface-variant/50 block text-[10px] uppercase">Duração:</span>
                    <span className="font-bold text-on-surface">
                      {activeEntry.extra_data.concentration ? 'Concentração, ' : ''}
                      {activeEntry.extra_data.duration}
                    </span>
                  </div>
                )}
                {activeEntry.extra_data.hit_die && (
                  <div>
                    <span className="text-on-surface-variant/50 block text-[10px] uppercase">Dado de Vida:</span>
                    <span className="font-bold text-on-surface">d{activeEntry.extra_data.hit_die}</span>
                  </div>
                )}
                {activeEntry.extra_data.weight && (
                  <div>
                    <span className="text-on-surface-variant/50 block text-[10px] uppercase">Peso:</span>
                    <span className="font-bold text-on-surface">{activeEntry.extra_data.weight} kg</span>
                  </div>
                )}
                {activeEntry.extra_data.cost_value && (
                  <div>
                    <span className="text-on-surface-variant/50 block text-[10px] uppercase">Custo:</span>
                    <span className="font-bold text-on-surface">
                      {activeEntry.extra_data.cost_value} {activeEntry.extra_data.cost_unit || 'po'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Bloco de Essência / Resumo Rápido */}
            {activeEntry.short_desc && (
              <div className="text-xs font-medium text-on-surface/90 bg-white/[0.03] border-l-2 border-sheet-accent/60 pl-3.5 py-2.5 rounded-r-xl leading-relaxed my-2">
                {activeEntry.short_desc}
              </div>
            )}

            {/* Descrição Completa com Nested Tooltips ativos */}
            <div className="pt-2 text-sm text-on-surface/90 leading-relaxed space-y-3">
              <LexiconText
                text={activeEntry.description || activeEntry.short_desc || 'Sem detalhes adicionais cadastrados.'}
                excludeEntryId={activeEntry.entry_id}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Campo de Busca + Filtro de Categorias */}
            <div className="p-4 border-b border-white/5 space-y-3 bg-white/[0.01]">
              {/* Input com botão de limpar ergonômico */}
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-3.5 text-on-surface-variant/40 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar magias, regras, condições, itens... (Ctrl+K)"
                  className="w-full h-12 pl-11 pr-11 bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-sheet-accent/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-sheet-accent/20 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-all font-['Inter'] shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="absolute right-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant/50 hover:text-white rounded-full transition-colors active:scale-90"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Chips de Categoria com rolagem horizontal suave */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {CODEX_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`min-h-[36px] px-3.5 rounded-xl text-xs font-['Space_Grotesk'] font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 border active:scale-95 ${
                        isSelected
                          ? 'bg-sheet-accent text-on-sheet-accent border-sheet-accent shadow-[0_4px_12px_rgba(225,29,72,0.3)] ring-1 ring-white/20'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] text-on-surface-variant/80 hover:text-white border-white/5 hover:border-white/15'
                      }`}
                    >
                      {getCategoryIcon(cat.id, 'w-3.5 h-3.5')}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de Resultados */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-white/5">
              {results.length === 0 ? (
                <div className="py-12 px-4 text-center text-on-surface-variant/40 font-['Space_Grotesk'] space-y-2">
                  <Search className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-sm font-bold uppercase tracking-wider">Nenhum termo encontrado</p>
                  <p className="text-xs font-normal">Tente buscar por sinônimos ou altere o filtro de categoria.</p>
                </div>
              ) : (
                results.map((entry) => (
                  <div
                    key={entry.entry_id}
                    onClick={() => setActiveEntry(entry)}
                    className="p-3.5 rounded-xl hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 group border border-transparent hover:border-white/5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getCategoryBadgeStyle(
                          entry.category
                        )}`}
                      >
                        {getCategoryIcon(entry.category, 'w-4 h-4')}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface group-hover:text-sheet-accent transition-colors truncate">
                            {entry.name_pt || entry.name}
                          </h3>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getCategoryBadgeStyle(
                              entry.category
                            )}`}
                          >
                            {entry.badge_label}
                          </span>
                        </div>

                        {entry.short_desc && (
                          <p className="text-xs text-on-surface-variant/70 line-clamp-1 mt-0.5">
                            {entry.short_desc}
                          </p>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-on-surface-variant/30 group-hover:text-sheet-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
