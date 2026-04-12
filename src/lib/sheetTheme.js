/** Cor de destaque padrão da ficha (header, lateral, blocos temáticos). */
export const DEFAULT_SHEET_ACCENT = '#9B2D42';

export const SHEET_ACCENT_PRESETS = [
  { label: 'Bordô', hex: '#9B2D42' },
  { label: 'Violeta', hex: '#7C3AED' },
  { label: 'Ciano', hex: '#06B6D4' },
  { label: 'Esmeralda', hex: '#059669' },
  { label: 'Âmbar', hex: '#D97706' },
  { label: 'Rosa', hex: '#DB2777' },
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
