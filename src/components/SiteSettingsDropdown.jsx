/**
 * Painel suspenso de configurações gerais (tema da ficha e futuras opções).
 * Posicionamento: pai com position relative.
 */
export default function SiteSettingsDropdown({ onEditTheme, onClose }) {
  return (
    <div
      className="absolute right-0 top-full z-[60] mt-2 w-64 rounded-xl border border-white/10 bg-surface-container-high shadow-xl shadow-black/40 py-1 animate-in fade-in zoom-in-95 duration-150"
      role="menu"
      aria-label="Configurações"
    >
      <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold tracking-[0.2em] text-on-surface-variant/50 uppercase font-['Space_Grotesk']">
        Configurações
      </p>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onEditTheme();
          onClose();
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-white/5 transition-colors"
      >
        <span className="material-symbols-outlined text-sheet-accent text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          palette
        </span>
        <span className="font-['Space_Grotesk'] font-bold tracking-wide">Editar tema</span>
      </button>

      <div className="my-1.5 border-t border-white/5 mx-2" />

      <p className="px-3 py-2 text-[10px] leading-relaxed text-on-surface-variant/45 text-center font-['Inter']">
        Outras opções do site aparecerão aqui nas próximas versões.
      </p>
    </div>
  );
}
