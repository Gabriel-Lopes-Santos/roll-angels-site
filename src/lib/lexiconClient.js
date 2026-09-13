import { supabase } from './supabaseClient';

const CACHE_KEY = 'ra_codex_cache_v2';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

let inMemoryEntries = null;
let inMemoryIndex = null;
let compiledRegex = null;
let fetchPromise = null;

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas
 */
export function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Carrega todos os verbetes da VIEW v_codex_entries com cache local
 */
export async function loadCodexEntries(forceRefresh = false) {
  if (inMemoryEntries && !forceRefresh) {
    return inMemoryEntries;
  }

  if (fetchPromise && !forceRefresh) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    // 1. Tenta recuperar do localStorage
    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data) && data.length > 0) {
            inMemoryEntries = data;
            buildIndex(data);
            return inMemoryEntries;
          }
        }
      } catch (err) {
        console.warn('[Codex] Erro ao ler cache local:', err);
      }
    }

    // 2. Busca do Supabase
    try {
      const { data, error } = await supabase
        .from('v_codex_entries')
        .select('*')
        .order('name_pt', { ascending: true });

      if (error) {
        console.error('[Codex] Erro ao carregar v_codex_entries:', error);
        return inMemoryEntries || [];
      }

      inMemoryEntries = data || [];
      buildIndex(inMemoryEntries);

      // Salva no localStorage em background
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              data: inMemoryEntries,
            })
          );
        } catch (e) {
          console.warn('[Codex] Falha ao gravar no localStorage (possível limite de espaço):', e);
        }
      }

      return inMemoryEntries;
    } catch (err) {
      console.error('[Codex] Falha na requisição:', err);
      return inMemoryEntries || [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Constrói o índice em memória e o Regex Unicode para detecção instantânea
 */
function buildIndex(entries) {
  const termMap = new Map(); // normalizedTerm -> entry
  const slugMap = new Map(); // slug -> entry
  const idMap = new Map();   // entry_id -> entry
  const keywordSet = new Set();

  entries.forEach((entry) => {
    idMap.set(entry.entry_id, entry);
    if (entry.slug) slugMap.set(entry.slug, entry);

    const candidates = [
      entry.name_pt,
      entry.name,
      ...(entry.synonyms || []),
    ];

    candidates.forEach((cand) => {
      if (!cand || typeof cand !== 'string') return;
      const clean = cand.trim();
      if (clean.length < 3) return; // ignora termos com menos de 3 caracteres para evitar falsos positivos
      
      const norm = normalizeText(clean);
      if (!termMap.has(norm)) {
        termMap.set(norm, entry);
      }
      keywordSet.add(clean);
    });
  });

  // Ordena os termos por tamanho decrescente para priorizar termos compostos ("ataque de oportunidade" antes de "ataque")
  const sortedKeywords = Array.from(keywordSet).sort((a, b) => b.length - a.length);

  // Escapa caracteres especiais para o regex
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keywordPattern = sortedKeywords.map(escapeRegExp).join('|');

  // Regex Unicode com suporte a [[Wikilinks]] e palavras com limites de caracteres Unicode
  if (keywordPattern) {
    compiledRegex = new RegExp(
      `(?:\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\])|(?:(?<![\\p{L}\\p{N}])(${keywordPattern})(?![\\p{L}\\p{N}]))`,
      'giu'
    );
  } else {
    compiledRegex = null;
  }

  inMemoryIndex = {
    termMap,
    slugMap,
    idMap,
  };
}

/**
 * Busca verbete por ID, slug ou termo
 */
export function getCodexEntry(identifier) {
  if (!inMemoryIndex || !identifier) return null;
  const { idMap, slugMap, termMap } = inMemoryIndex;

  if (idMap.has(identifier)) return idMap.get(identifier);
  if (slugMap.has(identifier)) return slugMap.get(identifier);

  const norm = normalizeText(identifier);
  if (termMap.has(norm)) return termMap.get(norm);

  return null;
}

/**
 * Tokeniza um texto puro dividindo em segmentos normais e termos identificados
 * @param {string} text - Texto a ser analisado
 * @param {string} [excludeEntryId] - ID do verbete para evitar auto-referência em sua própria descrição
 * @returns {Array<{type: 'text'|'term'|'wikilink', text: string, entry?: object, target?: string, label?: string}>}
 */
export function tokenizeLexiconText(text, excludeEntryId = null) {
  if (!text || typeof text !== 'string') return [];

  // Normaliza quebras de linha escapadas que vêm de banco de dados/JSON (\n literal)
  const normalizedText = text.replace(/\\n/g, '\n');

  if (!compiledRegex || !inMemoryIndex) {
    return [{ type: 'text', text: normalizedText }];
  }

  const { termMap, slugMap, idMap } = inMemoryIndex;
  const tokens = [];
  let lastIndex = 0;
  
  // Reseta o lastIndex do regex global
  compiledRegex.lastIndex = 0;
  let match;

  while ((match = compiledRegex.exec(normalizedText)) !== null) {
    const matchIndex = match.index;
    
    // Adiciona o texto antes do casamento
    if (matchIndex > lastIndex) {
      tokens.push({
        type: 'text',
        text: normalizedText.slice(lastIndex, matchIndex),
      });
    }

    const [fullMatch, wikiTarget, wikiLabel, keywordMatch] = match;

    if (wikiTarget) {
      // Sintaxe [[Alvo]] ou [[Alvo|Rótulo]]
      const targetClean = wikiTarget.trim();
      const label = wikiLabel ? wikiLabel.trim() : targetClean;
      const entry = getCodexEntry(targetClean);

      if (entry && entry.entry_id !== excludeEntryId) {
        tokens.push({
          type: 'term',
          text: label,
          entry,
        });
      } else {
        tokens.push({
          type: 'wikilink',
          text: label,
          target: targetClean,
          entry: entry || null,
        });
      }
    } else if (keywordMatch) {
      // Casamento automático de palavra-chave
      const norm = normalizeText(keywordMatch);
      const entry = termMap.get(norm);

      if (entry && entry.entry_id !== excludeEntryId) {
        tokens.push({
          type: 'term',
          text: keywordMatch,
          entry,
        });
      } else {
        tokens.push({
          type: 'text',
          text: keywordMatch,
        });
      }
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Texto restante
  if (lastIndex < normalizedText.length) {
    tokens.push({
      type: 'text',
      text: normalizedText.slice(lastIndex),
    });
  }

  return tokens;
}

/**
 * Busca e filtragem em tempo real para o Compêndio
 */
export function searchCodexEntries(query, category = 'all') {
  if (!inMemoryEntries) return [];

  const normQuery = normalizeText(query);

  return inMemoryEntries.filter((entry) => {
    // Filtro de categoria
    if (category !== 'all' && entry.category !== category) {
      return false;
    }

    if (!normQuery) return true;

    // Busca textual no nome, nome_pt, categoria, short_desc e sinônimos
    const namePtNorm = normalizeText(entry.name_pt);
    const nameEnNorm = normalizeText(entry.name);
    const descNorm = normalizeText(entry.short_desc || entry.description);

    if (namePtNorm.includes(normQuery)) return true;
    if (nameEnNorm.includes(normQuery)) return true;
    if (descNorm.includes(normQuery)) return true;

    if (Array.isArray(entry.synonyms)) {
      return entry.synonyms.some((s) => normalizeText(s).includes(normQuery));
    }

    return false;
  });
}

/**
 * Retorna categorias distintas disponíveis
 */
export const CODEX_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: 'layers' },
  { id: 'rule', label: 'Regras & Mecânicas', icon: 'book-open' },
  { id: 'condition', label: 'Condições', icon: 'activity' },
  { id: 'spell', label: 'Magias', icon: 'sparkles' },
  { id: 'item', label: 'Itens', icon: 'shield' },
  { id: 'feat', label: 'Talentos', icon: 'award' },
  { id: 'damage_type', label: 'Tipos de Dano', icon: 'flame' },
  { id: 'class', label: 'Classes', icon: 'swords' },
  { id: 'lore', label: 'Campanha & Lore', icon: 'map-pin' },
];
