import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getSpellcastingInfo,
  getCharacterGrimoire,
  toggleSpellPrepared,
  getCharSpellSlotsUsed,
  saveCharSpellSlotsUsed,
  autoPopulateClassSpells,
} from '../../lib/supabaseClient';

// =====================================================================
// CORES POR ESCOLA DE MAGIA
// =====================================================================
const SCHOOL_COLORS = {
  divination:    { border: '#e8e8e8', text: '#e8e8e8', bg: 'rgba(232,232,232,0.08)', label: 'Adivinhação' },
  conjuration:   { border: '#a855f7', text: '#a855f7', bg: 'rgba(168,85,247,0.08)',  label: 'Conjuração' },
  abjuration:    { border: '#60a5fa', text: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   label: 'Abjuração' },
  evocation:     { border: '#e8192c', text: '#e8192c', bg: 'rgba(232,25,44,0.08)',   label: 'Evocação' },
  enchantment:   { border: '#ec4899', text: '#ec4899', bg: 'rgba(236,72,153,0.08)',   label: 'Encantamento' },
  necromancy:    { border: '#777777', text: '#777777', bg: 'rgba(0,0,0,0.45)',          label: 'Necromancia' },
  transmutation: { border: '#eab308', text: '#eab308', bg: 'rgba(234,179,8,0.08)',    label: 'Transmutação' },
  illusion:      { border: '#16a34a', text: '#16a34a', bg: 'rgba(22,163,74,0.08)',     label: 'Ilusão' },
};

// =====================================================================
// CORES FIXAS POR TIPO DE MAGIA (independentes do tema do usuário)
// =====================================================================
const ARCANE_CLASSES = ['wizard', 'sorcerer', 'warlock', 'bard', 'artificer',
  'mago', 'feiticeiro', 'bruxo', 'bardo', 'artífice'];
const DIVINE_CLASSES = ['cleric', 'paladin', 'druid', 'ranger',
  'clérigo', 'clerigo', 'paladino', 'druida', 'patrulheiro'];

const MAGIC_MC = {
  arcane: {
    primary: '#a855f7',
    muted:   'rgba(168,85,247,0.55)',
    slot:    { border: 'rgba(168,85,247,0.45)', bg: 'rgba(168,85,247,0.18)' },
    label:   'Arcano',
  },
  divine: {
    primary: '#38bdf8',
    muted:   'rgba(56,189,248,0.55)',
    slot:    { border: 'rgba(56,189,248,0.45)', bg: 'rgba(56,189,248,0.18)' },
    label:   'Divino',
  },
};

function getMagicMC(className) {
  if (!className) return null;
  const lower = className.toLowerCase();
  if (ARCANE_CLASSES.some(c => lower.includes(c))) return MAGIC_MC.arcane;
  if (DIVINE_CLASSES.some(c => lower.includes(c))) return MAGIC_MC.divine;
  return null;
}

function getSchoolStyle(school) {
  if (!school) return SCHOOL_COLORS.evocation;
  const key = school.toLowerCase().replace(/ç/g, 'c').replace(/ã/g, 'a');
  // Match both EN and PT school names
  const mapping = {
    divination: 'divination', adivinhacao: 'divination', 'adivinhação': 'divination',
    conjuration: 'conjuration', conjuracao: 'conjuration', 'conjuração': 'conjuration',
    abjuration: 'abjuration', abjuracao: 'abjuration', 'abjuração': 'abjuration',
    evocation: 'evocation', evocacao: 'evocation', 'evocação': 'evocation',
    enchantment: 'enchantment', encantamento: 'enchantment',
    necromancy: 'necromancy', necromancia: 'necromancy',
    transmutation: 'transmutation', transmutacao: 'transmutation', 'transmutação': 'transmutation',
    illusion: 'illusion', ilusao: 'illusion', 'ilusão': 'illusion',
  };
  return SCHOOL_COLORS[mapping[key] || mapping[school.toLowerCase()] || 'evocation'] || SCHOOL_COLORS.evocation;
}

const CIRCLE_LABELS = {
  1: '1º Círculo', 2: '2º Círculo', 3: '3º Círculo', 4: '4º Círculo', 5: '5º Círculo',
  6: '6º Círculo', 7: '7º Círculo', 8: '8º Círculo', 9: '9º Círculo',
};

// =====================================================================
// COMPONENTE PRINCIPAL
// =====================================================================
export default function MagiasTab({ character }) {
  const [loading, setLoading] = useState(true);
  const [spellInfo, setSpellInfo] = useState(null);
  const [cantrips, setCantrips] = useState([]);
  const [knownSpells, setKnownSpells] = useState([]);
  const [preparedIds, setPreparedIds] = useState(new Set());
  const [togglingId, setTogglingId] = useState(null);
  const [expandedSpell, setExpandedSpell] = useState(null);
  const [usedSlots, setUsedSlots] = useState({});
  const [usedPactSlots, setUsedPactSlots] = useState(0);

  const saveTimerRef = useRef(null);

  // Salva com debounce de 600ms para não spammar o banco a cada clique
  const saveSlotsDebounced = useCallback((slots, pactSlots) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCharSpellSlotsUsed(character.id, slots, pactSlots);
    }, 600);
  }, [character.id]);

  // Alterna slots usados (preenchimento progressivo da esquerda p/ direita)
  const toggleSlot = (level, index) => {
    setUsedSlots(prev => {
      const used = prev[level] || 0;
      const newUsed = index < used ? index : index + 1;
      const next = { ...prev, [level]: newUsed };
      saveSlotsDebounced(next, usedPactSlots);
      return next;
    });
  };

  const togglePactSlot = (index) => {
    setUsedPactSlots(prev => {
      const next = index < prev ? index : index + 1;
      saveSlotsDebounced(usedSlots, next);
      return next;
    });
  };

  const loadGrimoire = useCallback(async () => {
    setLoading(true);
    const { data: info } = await getSpellcastingInfo(character.id);
    setSpellInfo(info);

    if (info?.isCaster) {
      const grimoire = await getCharacterGrimoire(character.id, info);
      setCantrips(grimoire.cantrips);
      setKnownSpells(grimoire.knownSpells);
      setPreparedIds(grimoire.preparedSpellIds);
    }

    // Carrega slots usados salvos no banco
    const savedSlots = await getCharSpellSlotsUsed(character.id);
    setUsedSlots(savedSlots.used_slots);
    setUsedPactSlots(savedSlots.used_pact_slots);

    setLoading(false);
  }, [character.id]);

  useEffect(() => { loadGrimoire(); }, [loadGrimoire]);

  const handleTogglePrepare = async (spellId) => {
    setTogglingId(spellId);
    const shouldPrepare = !preparedIds.has(spellId);
    const result = await toggleSpellPrepared(character.id, spellId, shouldPrepare);
    if (result.success) {
      setPreparedIds(prev => {
        const next = new Set(prev);
        if (shouldPrepare) next.add(spellId);
        else next.delete(spellId);
        return next;
      });
    }
    setTogglingId(null);
  };

  // ---------- LOADING ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 animate-in fade-in duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-sheet-accent" />
      </div>
    );
  }

  // Cor fixa por tipo de magia (arcana = roxo, divina = azul celestial)
  const mc = getMagicMC(spellInfo?.className || character.class);

  // ---------- NÃO CONJURADOR ----------
  if (!spellInfo?.isCaster) {
    return (
      <div className="animate-in fade-in duration-500 max-w-3xl mx-auto">
        <Header mc={mc} />
        <div className="mt-12 bg-surface-container p-10 rounded border border-outline-variant/10 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-4 block">block</span>
          <p className="font-['Space_Grotesk'] text-lg font-bold text-on-surface-variant/60 uppercase tracking-widest">
            {spellInfo?.className || character.class} não conjura magias
          </p>
          <p className="text-sm text-on-surface-variant/30 mt-2">Este personagem não possui habilidades de conjuração.</p>
        </div>
      </div>
    );
  }

  // ---------- GRIMÓRIO COMPLETO ----------
  const groupedByLevel = {};
  knownSpells.forEach(spell => {
    const lvl = spell.level || 1;
    if (!groupedByLevel[lvl]) groupedByLevel[lvl] = [];
    groupedByLevel[lvl].push(spell);
  });

  // Ordenar magias por nome dentro de cada grupo
  Object.values(groupedByLevel).forEach(spells => spells.sort((a, b) => (a.name_pt || a.name).localeCompare(b.name_pt || b.name)));
  cantrips.sort((a, b) => (a.name_pt || a.name).localeCompare(b.name_pt || b.name));

  const preparedCount = preparedIds.size;
  const slotsEntries = Object.entries(spellInfo.slots || {}).filter(([k]) => !isNaN(k));

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">

      {/* HEADER */}
      <Header mc={mc} />

      {/* STATS DE CONJURAÇÃO */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Habilidade" value={spellInfo.spellcastingAbility} mc={mc} />
        <StatBox label="CD Salvaguarda" value={spellInfo.spellSaveDC} icon="shield" mc={mc} />
        <StatBox label="Bônus Ataque" value={`+${spellInfo.spellAttackBonus}`} icon="target" mc={mc} />
      </div>

      {/* SLOTS DE MAGIA */}
      {slotsEntries.length > 0 && (
        <div className="bg-surface-container p-4 rounded border border-outline-variant/10">
          <p
            className={`font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] uppercase mb-3 ${mc ? '' : 'text-sheet-accent-weak'}`}
            style={mc ? { color: mc.muted } : {}}
          >
            Espaços de Magia
          </p>
          <div className="flex flex-wrap gap-4">
            {slotsEntries.map(([level, count]) => {
              const used = usedSlots[level] || 0;
              const slotColor = mc ? mc.primary : 'rgba(255,255,255,0.85)';
              return (
                <div key={level} className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest w-6"
                    style={{ color: mc ? mc.primary : undefined }}
                  >
                    {level}º
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: count }).map((_, i) => {
                      const isFilled = i < used;
                      return (
                        <div
                          key={i}
                          title={isFilled ? 'Recuperar slot' : 'Usar slot'}
                          onClick={() => toggleSlot(level, i)}
                          className="w-3.5 h-3.5 rounded-sm border cursor-pointer transition-all duration-150 hover:scale-110 active:scale-95"
                          style={{
                            borderColor: mc ? mc.primary : 'rgba(255,255,255,0.5)',
                            backgroundColor: isFilled ? slotColor : 'transparent',
                            boxShadow: isFilled ? `0 0 6px ${slotColor}66` : 'none',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PACT SLOTS (Warlock) */}
      {spellInfo.slots?.pactSlots && (
        <div className="bg-surface-container p-4 rounded border border-outline-variant/10">
          <p
            className={`font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] uppercase mb-3 ${mc ? '' : 'text-sheet-accent-weak'}`}
            style={mc ? { color: mc.muted } : {}}
          >
            Espaços de Pacto — Nível {spellInfo.slots.pactSlotLevel}
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: spellInfo.slots.pactSlots }).map((_, i) => {
              const isFilled = i < usedPactSlots;
              const slotColor = mc ? mc.primary : 'rgba(255,255,255,0.85)';
              return (
                <div
                  key={i}
                  title={isFilled ? 'Recuperar slot' : 'Usar slot'}
                  onClick={() => togglePactSlot(i)}
                  className="w-5 h-5 rounded-sm border-2 cursor-pointer transition-all duration-150 hover:scale-110 active:scale-95"
                  style={{
                    borderColor: mc ? mc.primary : 'rgba(255,255,255,0.5)',
                    backgroundColor: isFilled ? slotColor : 'transparent',
                    boxShadow: isFilled ? `0 0 8px ${slotColor}66` : 'none',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* CONTADOR DE PREPARADAS (se necessário) */}
      {spellInfo.needsPreparation && (
        <div className="bg-surface-container-high p-3 rounded flex items-center justify-between">
          <span
            className={`font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] uppercase ${mc ? '' : 'text-sheet-accent-weak'}`}
            style={mc ? { color: mc.muted } : {}}
          >
            Magias Preparadas
          </span>
          <span className="font-['Space_Grotesk'] text-sm font-black">
            <span
              className={preparedCount > spellInfo.maxPrepared ? 'text-red-400' : (mc ? '' : 'text-sheet-accent')}
              style={preparedCount > spellInfo.maxPrepared ? {} : (mc ? { color: mc.primary } : {})}
            >
              {preparedCount}
            </span>
            <span className="text-on-surface-variant/30"> / {spellInfo.maxPrepared}</span>
          </span>
        </div>
      )}

      {/* TRUQUES */}
      {cantrips.length > 0 && (
        <SpellSection
          title="Truques"
          icon="auto_awesome"
          spells={cantrips}
          showPrepareToggle={false}
          preparedIds={preparedIds}
          expandedSpell={expandedSpell}
          setExpandedSpell={setExpandedSpell}
        />
      )}

      {/* MAGIAS POR CÍRCULO */}
      {Object.keys(groupedByLevel).sort((a, b) => a - b).map(level => (
        <SpellSection
          key={level}
          title={CIRCLE_LABELS[level] || `Nível ${level}`}
          icon="bolt"
          spells={groupedByLevel[level]}
          showPrepareToggle={spellInfo.needsPreparation}
          preparedIds={preparedIds}
          onTogglePrepare={handleTogglePrepare}
          togglingId={togglingId}
          expandedSpell={expandedSpell}
          setExpandedSpell={setExpandedSpell}
          slotCount={spellInfo.slots?.[level]}
        />
      ))}

      {/* MENSAGEM SE GRIMÓRIO VAZIO */}
      {cantrips.length === 0 && knownSpells.length === 0 && (
        <div className="bg-surface-container p-10 rounded border border-outline-variant/10 text-center mt-4">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/15 block mb-3">menu_book</span>
          <p className="font-['Space_Grotesk'] text-sm font-bold text-on-surface-variant/40 uppercase tracking-widest">
            Grimório Vazio
          </p>
          <p className="text-xs text-on-surface-variant/25 mt-2 mb-6">
            Nenhuma magia foi adicionada a este personagem ainda.
          </p>

          {/* Botão de Auto-Populamento para Classes de Preparo Completo */}
          {spellInfo?.classNameEn && ['cleric', 'druid', 'paladin', 'artificer'].includes(spellInfo.classNameEn) && (
            <button
              onClick={async () => {
                setLoading(true);
                const maxSpellLevel = Math.max(...Object.keys(spellInfo.slots || {}).map(Number), 0);
                const res = await autoPopulateClassSpells(character.id, spellInfo.classId, maxSpellLevel);
                
                if (!res.success) {
                   alert("Ops! O salvamento falhou: " + res.error);
                }
                
                await loadGrimoire(); // Re-fetch all
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded font-bold text-xs uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-['Space_Grotesk']"
              style={mc ? { color: mc.primary, backgroundColor: mc.slot.bg, borderColor: mc.slot.border } : {}}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
              Carregar Magias da Classe
            </button>
          )}
        </div>
      )}

    </div>
  );
}

// =====================================================================
// SUB-COMPONENTES
// =====================================================================

function Header({ mc }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
      <span
        className={`material-symbols-outlined text-3xl ${mc ? '' : 'text-sheet-accent'}`}
        style={{ fontVariationSettings: "'FILL' 1", ...(mc ? { color: mc.primary } : {}) }}
      >
        auto_stories
      </span>
      <div>
        <p
          className={`font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] uppercase ${mc ? '' : 'text-sheet-accent-weak'}`}
          style={mc ? { color: mc.muted } : {}}
        >
          {mc ? mc.label : 'Arcano'}
        </p>
        <h2 className="font-['Space_Grotesk'] text-2xl font-black tracking-tight">GRIMÓRIO</h2>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, mc }) {
  return (
    <div className="bg-surface-container p-4 rounded text-center border border-outline-variant/10">
      <p
        className={`font-['Space_Grotesk'] text-[9px] font-bold tracking-[0.15em] uppercase mb-1 ${mc ? '' : 'text-sheet-accent-weak'}`}
        style={mc ? { color: mc.muted } : {}}
      >
        {label}
      </p>
      <div className="flex items-center justify-center gap-2">
        {icon && (
          <span
            className={`material-symbols-outlined text-lg ${mc ? '' : 'text-sheet-accent'}`}
            style={{ fontVariationSettings: "'FILL' 1", ...(mc ? { color: mc.primary } : {}) }}
          >
            {icon}
          </span>
        )}
        <span className="font-['Space_Grotesk'] text-2xl font-black">{value}</span>
      </div>
    </div>
  );
}

function SpellSection({ title, icon, spells, showPrepareToggle, preparedIds, onTogglePrepare, togglingId, expandedSpell, setExpandedSpell, slotCount }) {
  const preparedInSection = showPrepareToggle ? spells.filter(s => preparedIds.has(s.id)).length : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sheet-accent text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          <h3 className="font-['Space_Grotesk'] text-xs font-black tracking-[0.15em] uppercase text-sheet-accent">
            {title}
          </h3>
          <span className="text-[10px] font-bold text-on-surface-variant/30">({spells.length})</span>
        </div>
        <div className="flex items-center gap-3">
          {slotCount && (
            <div className="flex items-center gap-1">
              {Array.from({ length: slotCount }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-sm border border-sheet-accent/40 bg-sheet-accent/20" />
              ))}
            </div>
          )}
          {showPrepareToggle && (
            <span className="text-[10px] font-bold text-on-surface-variant/30">
              {preparedInSection} prep.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {spells.map(spell => (
          <SpellCard
            key={spell.id}
            spell={spell}
            showPrepareToggle={showPrepareToggle}
            isPrepared={preparedIds.has(spell.id)}
            isToggling={togglingId === spell.id}
            onToggle={() => onTogglePrepare?.(spell.id)}
            isExpanded={expandedSpell === spell.id}
            onToggleExpand={() => setExpandedSpell(expandedSpell === spell.id ? null : spell.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SpellCard({ spell, showPrepareToggle, isPrepared, isToggling, onToggle, isExpanded, onToggleExpand }) {
  const school = getSchoolStyle(spell.school_pt || spell.school);
  const spellName = spell.name_pt || spell.name || '???';

  // Parse components
  const components = spell.components || '';
  const hasMaterial = components.includes('M');

  return (
    <div
      className="rounded overflow-hidden transition-all duration-200 hover:scale-[1.01] group cursor-pointer"
      style={{
        borderLeft: `3px solid ${school.border}`,
        background: `linear-gradient(135deg, ${school.bg}, transparent 60%)`,
      }}
      onClick={onToggleExpand}
    >
      <div className="bg-surface-container/80 backdrop-blur-sm p-3.5">
        {/* Row 1: Name + School Badge + Prepare Toggle */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4
              className="font-['Space_Grotesk'] text-sm font-black uppercase tracking-wide truncate"
              style={{ color: school.text }}
            >
              {spellName}
            </h4>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
              style={{
                color: school.text,
                borderColor: `${school.border}33`,
                backgroundColor: school.bg,
              }}
            >
              {school.label}
            </span>
            {showPrepareToggle && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                disabled={isToggling}
                className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all shrink-0 ${
                  isPrepared
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-on-surface-variant/20 bg-transparent hover:border-on-surface-variant/40'
                }`}
                title={isPrepared ? 'Despreparar' : 'Preparar'}
              >
                {isToggling ? (
                  <Loader2 className="w-3 h-3 animate-spin text-on-surface-variant/40" />
                ) : isPrepared ? (
                  <span className="material-symbols-outlined text-green-500 text-xs" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>check</span>
                ) : null}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Quick Info Tags */}
        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50">
          {/* Casting Time */}
          {spell.casting_time && (
            <Tag icon="schedule">{spell.casting_time}</Tag>
          )}
          {/* Range */}
          {spell.range && (
            <Tag icon="straighten">{spell.range}</Tag>
          )}
          {/* Components */}
          {components && (
            <Tag icon={hasMaterial ? 'diamond' : 'gesture'}>{components}</Tag>
          )}
          {/* Duration */}
          {spell.duration && (
            <Tag icon="hourglass_empty">{spell.duration}</Tag>
          )}
          {/* Concentration */}
          {spell.concentration && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>psychology</span>
              CONC.
            </span>
          )}
          {/* Ritual */}
          {spell.ritual && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>auto_fix_high</span>
              RITUAL
            </span>
          )}
        </div>

        {/* Row 3: Expanded Description */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
            {spell.material && (
              <p className="text-[10px] text-on-surface-variant/40 mb-2 italic">
                <span className="font-bold text-on-surface-variant/60">Material:</span> {spell.material}
              </p>
            )}
            {spell.desc && (
              <p className="text-xs text-on-surface-variant/70 leading-relaxed whitespace-pre-wrap">
                {spell.desc}
              </p>
            )}
            {spell.higher_level && (
              <p className="text-xs text-on-surface-variant/50 mt-2 italic">
                <span className="font-bold text-on-surface-variant/70">Em Níveis Superiores:</span> {spell.higher_level}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
      <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>{icon}</span>
      {children}
    </span>
  );
}
