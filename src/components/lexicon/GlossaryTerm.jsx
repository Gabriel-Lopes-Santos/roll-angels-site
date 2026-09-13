import React, { useRef } from 'react';
import { useLexicon } from '../../context/LexiconContext';

/**
 * Componente que envolve termos identificados com sublinhado pontilhado interativo estilo BG3
 */
export default function GlossaryTerm({ entry, text, isNested = false }) {
  const { showHoverTooltip, hideHoverTooltip, pinOrPushTooltip } = useLexicon();
  const termRef = useRef(null);

  if (!entry) {
    return <span>{text}</span>;
  }

  const handleMouseEnter = () => {
    // Se o termo estiver DENTRO de um tooltip já aberto, não substitui por hover
    // para evitar que o tooltip atual desapareça ou salte de posição
    if (isNested) return;

    if (termRef.current) {
      const rect = termRef.current.getBoundingClientRect();
      showHoverTooltip(entry, rect);
    }
  };

  const handleMouseLeave = () => {
    if (isNested) return;
    hideHoverTooltip();
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (termRef.current) {
      const rect = termRef.current.getBoundingClientRect();
      pinOrPushTooltip(entry, rect);
    }
  };

  return (
    <span
      ref={termRef}
      data-lexicon-term="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`inline cursor-pointer border-b-[1.5px] border-dotted transition-all duration-150 font-medium py-0 px-0.5 rounded active:scale-[0.97] ${
        isNested
          ? 'border-amber-400/60 hover:border-amber-300 text-amber-200/95 hover:text-amber-100 hover:bg-amber-400/15 shadow-xs'
          : 'border-sheet-accent/60 hover:border-sheet-accent text-inherit hover:text-sheet-accent hover:bg-sheet-accent/10'
      }`}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalhes de ${entry.name_pt || entry.name} (Clique para fixar ou navegar)`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
    >
      {text}
    </span>
  );
}
