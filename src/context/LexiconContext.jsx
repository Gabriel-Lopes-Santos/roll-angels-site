import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { loadCodexEntries, getCodexEntry } from '../lib/lexiconClient';

const LexiconContext = createContext(null);

export function LexiconProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado do Drawer do Compêndio
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialSearch, setDrawerInitialSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Estado das Tooltips Aninhadas (Pilha / Stack)
  // Cada item na pilha é um verbete ativo
  const [tooltipStack, setTooltipStack] = useState([]);
  const [pinnedTooltip, setPinnedTooltip] = useState(null); // No desktop, tooltip travada
  const [hoveredTooltip, setHoveredTooltip] = useState(null); // Preview no hover
  const hoverTimeoutRef = useRef(null);

  // Carrega o dicionário em background
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await loadCodexEntries();
        if (isMounted) {
          setEntries(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('[LexiconContext] Erro ao carregar dicionário:', err);
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Atalhos Globais: Ctrl+K / Cmd+K para abrir o Compêndio, 'T' para travar tooltip
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignora se estiver digitando em input ou textarea
      const targetTag = e.target?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable;

      // Ctrl+K ou Cmd+K: Alterna Compêndio
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
        return;
      }

      // Escape: Fecha tooltips ou drawer
      if (e.key === 'Escape') {
        if (tooltipStack.length > 0 || pinnedTooltip) {
          setTooltipStack([]);
          setPinnedTooltip(null);
          setHoveredTooltip(null);
          return;
        }
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
          return;
        }
      }

      // Tecla 'T': Trava (Pin) a tooltip que estiver em hover (estilo BG3)
      if (!isInput && (e.key === 't' || e.key === 'T')) {
        if (hoveredTooltip && tooltipStack.length === 0) {
          e.preventDefault();
          setPinnedTooltip(hoveredTooltip.entry);
          setTooltipStack([hoveredTooltip]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredTooltip, pinnedTooltip, isDrawerOpen, tooltipStack]);

  /**
   * Abre o Drawer do Compêndio com busca ou verbete pré-selecionado
   */
  const openCompendium = useCallback((queryOrEntryId = null) => {
    if (queryOrEntryId) {
      const found = getCodexEntry(queryOrEntryId);
      if (found) {
        setSelectedEntry(found);
        setDrawerInitialSearch(found.name_pt || found.name);
      } else {
        setDrawerInitialSearch(queryOrEntryId);
      }
    }
    setIsDrawerOpen(true);
  }, []);

  const closeCompendium = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  /**
   * Ações para Tooltips
   */
  const showHoverTooltip = useCallback((entry, targetRect) => {
    // Se a tooltip já estiver fixada (pinned), ignora hovers de termos no background
    if (tooltipStack.length > 0) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredTooltip({ entry, targetRect });
  }, [tooltipStack.length]);

  const hideHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTooltip(null);
    }, 350);
  }, []);

  const cancelHideHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  }, []);

  /**
   * Fixa a tooltip ou navega para um termo aninhado mais profundo
   */
  const pinOrPushTooltip = useCallback((entry, targetRect) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setPinnedTooltip(entry);
    setTooltipStack((prev) => {
      // Se o termo já é o último da pilha, não duplica
      if (prev.length > 0 && prev[prev.length - 1].entry?.entry_id === entry.entry_id) {
        return prev;
      }
      return [...prev, { entry, targetRect }];
    });
  }, []);

  /**
   * Volta um nível na pilha de tooltips
   */
  const popTooltip = useCallback(() => {
    setTooltipStack((prev) => {
      if (prev.length <= 1) {
        setPinnedTooltip(null);
        return [];
      }
      const next = prev.slice(0, -1);
      setPinnedTooltip(next[next.length - 1].entry);
      return next;
    });
  }, []);

  /**
   * Fecha todas as tooltips
   */
  const dismissAllTooltips = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setPinnedTooltip(null);
    setTooltipStack([]);
    setHoveredTooltip(null);
  }, []);

  const value = {
    entries,
    loading,
    isDrawerOpen,
    drawerInitialSearch,
    selectedEntry,
    setSelectedEntry,
    openCompendium,
    closeCompendium,
    // Tooltips
    tooltipStack,
    pinnedTooltip,
    hoveredTooltip,
    showHoverTooltip,
    hideHoverTooltip,
    cancelHideHoverTooltip,
    pinOrPushTooltip,
    popTooltip,
    dismissAllTooltips,
  };

  return <LexiconContext.Provider value={value}>{children}</LexiconContext.Provider>;
}

export function useLexicon() {
  const context = useContext(LexiconContext);
  if (!context) {
    throw new Error('useLexicon deve ser usado dentro de um LexiconProvider');
  }
  return context;
}
