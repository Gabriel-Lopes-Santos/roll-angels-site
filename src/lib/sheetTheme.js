/** Cor de destaque padrão da ficha (header, lateral, blocos temáticos). */
export const DEFAULT_SHEET_ACCENT = '#9B2D42';

export const SHEET_ACCENT_PRESETS = [
  { label: 'Bordô', hex: '#9B2D42' },
  { label: 'Carmesim', hex: '#DC2626' },
  { label: 'Vinho', hex: '#881337' },
  { label: 'Rosa', hex: '#DB2777' },
  { label: 'Fúcsia', hex: '#D946EF' },
  { label: 'Púrpura', hex: '#A855F7' },
  { label: 'Violeta', hex: '#7C3AED' },
  { label: 'Indigo Profundo', hex: '#312E81' },
  { label: 'Indigo', hex: '#4F46E5' },
  { label: 'Safira', hex: '#2563EB' },
  { label: 'Azul Elétrico', hex: '#0EA5E9' },
  { label: 'Oceano', hex: '#0891B2' },
  { label: 'Ciano', hex: '#06B6D4' },
  { label: 'Menta', hex: '#2DD4BF' },
  { label: 'Esmeralda', hex: '#059669' },
  { label: 'Floresta', hex: '#15803D' },
  { label: 'Lima', hex: '#84CC16' },
  { label: 'Verde Lima', hex: '#65A30D' },
  { label: 'Âmbar', hex: '#D97706' },
  { label: 'Ouro', hex: '#EAB308' },
  { label: 'Coral', hex: '#F97316' },
  { label: 'Bronze', hex: '#92400E' },
  { label: 'Terra', hex: '#78350F' },
  { label: 'Ardósia', hex: '#475569' },
  { label: 'Prata', hex: '#94A3B8' },
];

export function normalizeSheetAccent(input) {
  if (typeof input !== 'string') return DEFAULT_SHEET_ACCENT;
  const t = input.trim();
  let m = t.match(/^#([0-9A-Fa-f]{6})$/i);
  if (m) return `#${m[1].toUpperCase()}`;
  m = t.match(/^#([0-9A-Fa-f]{3})$/i);
  if (m) {
    const [a, b, c] = m[1].split('');
    return `#${a}${a}${b}${b}${c}${c}`.toUpperCase();
  }
  return DEFAULT_SHEET_ACCENT;
}

export function getSheetAccentFromUser(user) {
  return normalizeSheetAccent(user?.user_metadata?.sheet_accent);
}
