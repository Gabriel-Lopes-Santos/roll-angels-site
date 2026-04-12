import { useState, useEffect } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { SHEET_ACCENT_PRESETS, normalizeSheetAccent } from '../lib/sheetTheme';
import { updateUserSheetAccent } from '../lib/supabaseClient';

export default function SheetThemeSettingsModal({ open, onClose, currentAccent, onSaved }) {
  const [hex, setHex] = useState(currentAccent);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setHex(currentAccent);
      setErr('');
    }
  }, [open, currentAccent]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    const normalized = normalizeSheetAccent(hex);
    const res = await updateUserSheetAccent(normalized);
    setSaving(false);
    if (!res.success) {
      setErr(res.error || 'Erro ao salvar.');
      return;
    }
    onSaved?.(res.accent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-surface-container border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl relative"
        role="dialog"
        aria-labelledby="sheet-theme-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 id="sheet-theme-title" className="font-['Space_Grotesk'] text-xl font-black text-sheet-accent mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>palette</span>
          Tema da ficha
        </h3>
        <p className="text-xs text-on-surface-variant/70 mb-6 leading-relaxed">
          Esta cor aparece no topo, no menu lateral e nos blocos que acompanham o tema. Vida, CA, iniciativa e atributos não mudam.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
          <div className="flex flex-col items-center gap-2">
            <input
              type="color"
              value={normalizeSheetAccent(hex)}
              onChange={(e) => setHex(e.target.value)}
              className="w-20 h-20 rounded-xl cursor-pointer border-2 border-white/10 bg-transparent p-0 overflow-hidden"
              aria-label="Escolher cor"
            />
            <span className="text-[10px] font-mono text-on-surface-variant/60 uppercase">{normalizeSheetAccent(hex)}</span>
          </div>
          <div className="flex-1 w-full">
            <p className="text-[10px] font-bold tracking-widest text-on-surface-variant/50 uppercase mb-2">Presets</p>
            <div className="flex flex-wrap gap-2">
              {SHEET_ACCENT_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setHex(p.hex)}
                  title={p.label}
                  className={`w-9 h-9 rounded-lg border-2 transition-transform hover:scale-110 ${
                    normalizeSheetAccent(hex).toUpperCase() === p.hex.toUpperCase()
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-white/10'
                  }`}
                  style={{ backgroundColor: p.hex }}
                />
              ))}
            </div>
          </div>
        </div>

        {err && <p className="text-xs text-error mb-4">{err}</p>}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded text-xs font-bold font-['Space_Grotesk'] uppercase tracking-widest bg-sheet-accent-subtle hover:bg-sheet-accent-muted text-sheet-accent border border-sheet-accent-soft transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Salvar tema
          </button>
        </div>
      </div>
    </div>
  );
}
