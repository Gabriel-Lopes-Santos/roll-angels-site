import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLexicon } from '../../context/LexiconContext';
import LexiconText from './LexiconText';
import {
  BookOpen,
  Activity,
  Sparkles,
  Shield,
  Award,
  Flame,
  Swords,
  MapPin,
  Pin,
  X,
  ChevronLeft,
  ExternalLink,
  Layers,
} from 'lucide-react';

/**
 * Retorna o ícone Lucide correspondente à categoria
 */
export function getCategoryIcon(category, className = 'w-4 h-4') {
  switch (category) {
    case 'rule':
      return <BookOpen className={className} />;
    case 'condition':
      return <Activity className={className} />;
    case 'spell':
      return <Sparkles className={className} />;
    case 'item':
      return <Shield className={className} />;
    case 'feat':
      return <Award className={className} />;
    case 'damage_type':
      return <Flame className={className} />;
    case 'class':
      return <Swords className={className} />;
    case 'lore':
      return <MapPin className={className} />;
    default:
      return <Layers className={className} />;
  }
}

/**
 * Retorna estilos tonais para a badge da categoria
 */
export function getCategoryBadgeStyle(category) {
  switch (category) {
    case 'rule':
      return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    case 'condition':
      return 'text-purple-300 bg-purple-500/10 border-purple-500/30';
    case 'spell':
      return 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30';
    case 'item':
      return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
    case 'feat':
      return 'text-orange-300 bg-orange-500/10 border-orange-500/30';
    case 'damage_type':
      return 'text-rose-300 bg-rose-500/10 border-rose-500/30';
    case 'class':
      return 'text-blue-300 bg-blue-500/10 border-blue-500/30';
    case 'lore':
      return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30';
    default:
      return 'text-neutral-300 bg-white/10 border-white/20';
  }
}

export default function NestedTooltipPortal() {
  const {
    tooltipStack,
    pinnedTooltip,
    hoveredTooltip,
    cancelHideHoverTooltip,
    hideHoverTooltip,
    dismissAllTooltips,
    popTooltip,
    openCompendium,
    pinOrPushTooltip,
  } = useLexicon();

  const [isMobile, setIsMobile] = useState(false);
  const [cardHeight, setCardHeight] = useState(380);
  const tooltipRef = useRef(null);

  // Detecta tamanho da tela
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determina qual item exibir:
  // Se a pilha tiver itens (fixados), exibe o último da pilha
  // Senão, se houver preview de hover, exibe o preview
  const isPinned = tooltipStack.length > 0;
  const currentItem = isPinned
    ? tooltipStack[tooltipStack.length - 1]
    : hoveredTooltip;

  // Mede dinamicamente a altura real do card para posicionamento preciso sem estouro
  useEffect(() => {
    if (tooltipRef.current) {
      const h = tooltipRef.current.offsetHeight;
      if (h > 0 && Math.abs(h - cardHeight) > 5) {
        setCardHeight(h);
      }
    }
  }, [currentItem?.entry?.entry_id, tooltipStack.length]);

  // Fecha tooltip no desktop se o usuário clicar fora dele
  useEffect(() => {
    if (isMobile || (!isPinned && !hoveredTooltip)) return;

    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        // Ignora se o clique foi em outro termo do glossário
        if (!e.target.closest('[data-lexicon-term]')) {
          dismissAllTooltips();
        }
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isMobile, isPinned, hoveredTooltip, dismissAllTooltips]);

  if (!currentItem || !currentItem.entry) {
    return null;
  }

  const { entry, targetRect } = currentItem;

  // Renderização Desktop Flutuante
  const renderDesktopTooltip = () => {
    // Para termos aninhados na pilha (nível 2+), mantém a âncora do primeiro item
    // para que o card continue exatamente no mesmo lugar estável em vez de despencar para fora da tela!
    const anchorRect = (tooltipStack.length > 1 && tooltipStack[0].targetRect)
      ? tooltipStack[0].targetRect
      : targetRect;

    // Cálculo de posicionamento dinâmico
    let style = {
      position: 'fixed',
      zIndex: 9999,
      maxWidth: '380px',
      width: 'calc(100vw - 32px)',
    };

    if (anchorRect) {
      const padding = 16;
      const tooltipWidth = 380;
      const measuredHeight = cardHeight || 380;

      // Eixo X: alinha à esquerda do alvo com proteção de borda
      let left = anchorRect.left;
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }
      left = Math.max(padding, left);

      // Eixo Y: verifica se cabe embaixo ou se deve abrir para cima
      const spaceBelow = window.innerHeight - anchorRect.bottom - padding;
      const spaceAbove = anchorRect.top - padding;

      let top;
      if (spaceBelow >= measuredHeight || spaceBelow >= spaceAbove) {
        // Posiciona abaixo do alvo
        top = anchorRect.bottom + 8;
        // Se ultrapassar a parte inferior da janela, ajusta o topo para cima para manter tudo 100% visível
        if (top + measuredHeight > window.innerHeight - padding) {
          top = Math.max(padding, window.innerHeight - measuredHeight - padding);
        }
      } else {
        // Tem mais espaço em cima: posiciona acima do alvo
        top = anchorRect.top - measuredHeight - 8;
        if (top < padding) {
          top = padding;
        }
      }

      style.left = `${left}px`;
      style.top = `${top}px`;
      style.maxHeight = `calc(100vh - ${padding * 2}px)`;
    } else {
      style.left = '50%';
      style.top = '50%';
      style.transform = 'translate(-50%, -50%)';
      style.maxHeight = 'calc(100vh - 32px)';
    }

    return (
      <div
        ref={tooltipRef}
        style={style}
        onMouseEnter={cancelHideHoverTooltip}
        onMouseLeave={() => {
          if (!isPinned) hideHoverTooltip();
        }}
        onClick={() => {
          if (!isPinned && currentItem?.entry) {
            pinOrPushTooltip(currentItem.entry, currentItem.targetRect);
          }
        }}
        className={`relative bg-[#141216]/95 backdrop-blur-2xl border rounded-2xl p-4 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 text-on-surface max-h-[calc(100vh-32px)] flex flex-col before:absolute before:-top-3 before:h-3 before:left-0 before:right-0 after:absolute after:-bottom-3 after:h-3 after:left-0 after:right-0 overflow-hidden ${
          isPinned
            ? 'border-sheet-accent/60 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_-5px_rgba(225,29,72,0.25)] ring-1 ring-sheet-accent/25'
            : 'border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:border-white/20'
        }`}
      >
        {/* Traço de Brilho Arcano no topo */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-sheet-accent/70 to-transparent pointer-events-none" />

        {/* Barra Superior / Controles */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Botão Voltar (quando aninhado) */}
            {tooltipStack.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  popTooltip();
                }}
                className="px-2 py-1 -ml-1 text-on-surface-variant hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1 text-[11px] font-['Space_Grotesk'] font-bold uppercase tracking-wider active:scale-95 border border-white/5"
                title="Voltar ao termo anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}

            {/* Selo da Categoria */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-xs ${getCategoryBadgeStyle(
                entry.category
              )}`}
            >
              {getCategoryIcon(entry.category, 'w-3 h-3')}
              <span>{entry.badge_label || entry.category}</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isPinned && (
              <>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase bg-sheet-accent/20 text-sheet-accent border border-sheet-accent/40"
                  title="Tooltip fixada para navegação"
                >
                  <Pin className="w-2.5 h-2.5" />
                  Fixada
                </span>
                <button
                  type="button"
                  onClick={() => {
                    dismissAllTooltips();
                    openCompendium(entry.entry_id);
                  }}
                  className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-sheet-accent hover:bg-white/10 rounded-lg transition-colors active:scale-90"
                  title="Abrir no Compêndio"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={dismissAllTooltips}
                  className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-90"
                  title="Fechar (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Título e Subtítulo */}
        <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
          <h4 className="font-['Space_Grotesk'] text-base font-black tracking-tight text-sheet-accent uppercase">
            {entry.name_pt || entry.name}
          </h4>
          {entry.name && entry.name_pt && entry.name !== entry.name_pt && (
            <span className="text-[11px] font-mono text-on-surface-variant/50 tracking-normal">
              ({entry.name})
            </span>
          )}
        </div>

        {/* Bloco de Essência / Resumo Rápido */}
        {entry.short_desc && (
          <div className="text-[11px] font-medium text-on-surface/90 bg-white/[0.03] border-l-2 border-sheet-accent/60 pl-2.5 py-1.5 mb-2.5 leading-snug rounded-r">
            {entry.short_desc}
          </div>
        )}

        {/* Conteúdo com suporte a mais links aninhados */}
        <div className="text-xs text-on-surface/85 max-h-64 flex-1 min-h-0 overflow-y-auto pr-1 leading-relaxed border-t border-white/5 pt-2.5 space-y-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
          <LexiconText
            text={entry.description || entry.short_desc || 'Sem descrição adicional.'}
            excludeEntryId={entry.entry_id}
            isNested={true}
          />
        </div>

        {/* Rodapé interativo estilo BG3 */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-on-surface-variant/60 font-sans select-none">
          {!isPinned ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant/70">Pressione</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[9px] font-mono font-bold text-white shadow-xs">T</kbd>
                <span className="text-on-surface-variant/70">ou</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[9px] font-mono font-bold text-white shadow-xs">Clique</kbd>
                <span className="text-on-surface-variant/70">para travar</span>
              </div>
              <span className="text-[9px] font-mono text-on-surface-variant/40 tracking-wider uppercase">D&D 5e</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-sheet-accent font-semibold">
                <Layers className="w-3 h-3 text-sheet-accent" />
                <span>{tooltipStack.length > 1 ? `Nível ${tooltipStack.length} de aninhamento` : 'Navegação ativa'}</span>
              </div>
              <span className="text-[9px] font-mono text-on-surface-variant/40 tracking-wider uppercase">Esc fecha</span>
            </>
          )}
        </div>
      </div>
    );
  };

  // Renderização Mobile (Bottom Sheet - Apple HIG / M3)
  const renderMobileSheet = () => {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        {/* Backdrop desfoque */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={dismissAllTooltips}
        />

        {/* Painel Bottom Sheet */}
        <div className="relative bg-[#141216]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[28px] p-5 shadow-2xl max-h-[82vh] flex flex-col animate-in slide-in-from-bottom-8 duration-200 z-10 overflow-hidden">
          {/* Traço de Brilho Arcano no topo */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-sheet-accent/70 to-transparent pointer-events-none" />

          {/* Handle bar superior estilo iOS */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />

          {/* Header da Sheet */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              {tooltipStack.length > 1 && (
                <button
                  type="button"
                  onClick={popTooltip}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-sheet-accent active:scale-95 transition-transform"
                  title="Voltar ao termo anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border shadow-xs ${getCategoryBadgeStyle(
                  entry.category
                )}`}
              >
                {getCategoryIcon(entry.category, 'w-3.5 h-3.5')}
                <span>{entry.badge_label || entry.category}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={dismissAllTooltips}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-on-surface-variant hover:text-white active:scale-95 transition-transform rounded-full"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Corpo do Verbete */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
            <div>
              <h3 className="font-['Space_Grotesk'] text-xl font-black text-sheet-accent uppercase">
                {entry.name_pt || entry.name}
              </h3>
              {entry.name && entry.name_pt && entry.name !== entry.name_pt && (
                <span className="text-xs font-normal text-on-surface-variant/60 block font-mono mt-0.5">
                  {entry.name}
                </span>
              )}
            </div>

            {entry.short_desc && (
              <div className="text-xs font-medium text-on-surface/90 bg-white/[0.03] border-l-2 border-sheet-accent/60 pl-3 py-2 rounded-r-lg leading-relaxed">
                {entry.short_desc}
              </div>
            )}

            <div className="text-sm text-on-surface/90 leading-relaxed pt-2 border-t border-white/5 space-y-2">
              <LexiconText
                text={entry.description || entry.short_desc || 'Sem descrição adicional.'}
                excludeEntryId={entry.entry_id}
                isNested={true}
              />
            </div>
          </div>

          {/* Ação no Rodapé */}
          <div className="pt-3 border-t border-white/5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                dismissAllTooltips();
                openCompendium(entry.entry_id);
              }}
              className="w-full min-h-[48px] py-3.5 px-4 bg-sheet-accent/15 hover:bg-sheet-accent/25 active:scale-[0.98] transition-all rounded-xl text-xs font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sheet-accent flex items-center justify-center gap-2 border border-sheet-accent/30 shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir no Compêndio
            </button>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    isMobile ? renderMobileSheet() : renderDesktopTooltip(),
    document.body
  );
}
