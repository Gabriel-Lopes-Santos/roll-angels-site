import { CheckCircle2, Circle, GitBranch, Lock, Sparkles, Loader2, MousePointerClick, Table2, ChevronDown, ChevronUp, Swords, Shield, Zap, Check, X, Plus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';

const levelSort = (a, b) => {
  const left = a.level ?? Number.MAX_SAFE_INTEGER;
  const right = b.level ?? Number.MAX_SAFE_INTEGER;
  return left - right || (a.name || '').localeCompare(b.name || '', 'pt-BR');
};

function groupFeaturesByLevel(features) {
  return features.reduce((acc, feature) => {
    const key = feature.level ?? 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(feature);
    acc[key].sort(levelSort);
    return acc;
  }, {});
}

const RULE_KEY_LABELS = {
  rage_uses: 'Fúrias',
  rage_damage_bonus: 'Dano de Fúria',
  brutal_critical_dice: 'Crítico Brutal',
  expertise_total: 'Especializações',
  song_of_rest_die: 'Canção de Descanso',
  magical_secrets_picks: 'Segredos Mágicos',
  bardic_inspiration_die: 'Inspiração de Bardo',
  destroy_undead_cr: 'Destruir Mortos-Vivos (CR)',
  channel_divinity_uses: 'Canalizar Divindade',
  divine_intervention_auto_success: 'Intervenção Divina',
  wild_shape_fly: 'Voo Selvagem',
  wild_shape_swim: 'Nado Selvagem',
  wild_shape_uses: 'Formas Selvagens',
  wild_shape_max_cr: 'Forma Selvagem (CR)',
  wild_shape_unlimited: 'Formas Ilimitadas',
  indomitable_uses: 'Indomável',
  action_surge_uses: 'Surto de Ação',
  extra_attack_count: 'Ataques Extras',
  ki_points: 'Pontos de Ki',
  martial_arts_die: 'Artes Marciais',
  unarmored_movement_bonus_ft: 'Movimento sem Armadura',
  lay_on_hands_pool: 'Cura pelas Mãos',
  sneak_attack_dice_d6: 'Ataque Furtivo',
  sorcery_points: 'Pontos de Feitiçaria',
  metamagic_known: 'Metamagia',
  pact_slots: 'Espaços de Pacto',
  pact_slot_level: 'Nível (Pacto)',
  invocations_known: 'Invocações',
  mystic_arcanum_max: 'Arcanum Místico',
  infusions_known: 'Infusões',
  infused_items_max: 'Itens Infundidos'
};

const OPTION_TYPE_LABELS = {
  maneuver: 'Manobras',
  arcane_shot: 'Tiros Arcanos',
  rune: 'Runas',
  elemental_discipline: 'Disciplinas Elementais',
  land_terrain: 'Terreno do Círculo',
  hunters_prey: 'Presa do Caçador',
  defensive_tactics: 'Táticas Defensivas',
  multiattack: 'Multiataque',
  superior_hunters_defense: 'Defesa Superior do Caçador',
  draconic_ancestry: 'Ancestral Dracônico',
  genie_kind: 'Tipo de Gênio',
  armor_model: 'Modelo de Armadura',
  transmuters_stone_effect: 'Pedra do Transmutador',
  master_transmuter_effect: 'Mestre Transmutador',
  kensei_weapon: 'Arma Kensei',
  spell: 'Magias Adicionais',
};

const OPTION_TYPE_ICONS = {
  maneuver: Swords,
  arcane_shot: Zap,
  rune: Sparkles,
  elemental_discipline: Zap,
  hunters_prey: Swords,
  defensive_tactics: Shield,
  multiattack: Swords,
  superior_hunters_defense: Shield,
  draconic_ancestry: Sparkles,
  genie_kind: Sparkles,
  armor_model: Shield,
  rune: Sparkles,
  land_terrain: Sparkles,
  transmuters_stone_effect: Sparkles,
  master_transmuter_effect: Sparkles,
  kensei_weapon: Swords,
  spell: Zap,
};

function formatRuleValue(key, value) {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (key === 'rage_damage_bonus') return `+${value}`;
  if (key === 'sneak_attack_dice_d6') return `${value}d6`;
  if (key === 'martial_arts_die') return `1d${value}`;
  if (key === 'song_of_rest_die' || key === 'bardic_inspiration_die') return `1d${value}`;
  if (key === 'unarmored_movement_bonus_ft') return `+${value} ft`;
  if (key === 'wild_shape_unlimited') return value ? 'Ilimitado' : '-';
  if (key === 'rage_uses' && value === -1) return 'Ilimitado';
  if (value === 0 && key === 'brutal_critical_dice') return '-';
  return value;
}

const isRedundantFeature = (name) => {
  if (!name) return false;
  const redundantPatterns = [
    /^Característica do Juramento Sagrado$/i,
    /^Característica do Arquétipo$/i,
    /^Característica do Caminho$/i,
    /^Característica da Origem Feiticeira$/i,
    /^Característica do Círculo$/i,
    /^Característica do Domínio$/i,
    /^Característica da Tradição Monástica$/i,
    /^Característica do Especialista$/i,
    /^Habilidade de Subclasse$/i,
    /^Característica de Subclasse$/i,
    /^Características de Subclasse$/i
  ];
  return redundantPatterns.some(pattern => pattern.test(name));
};

function FeatureCard({ feature, unlocked, variant = 'class' }) {
  const baseClass = unlocked
    ? 'border-sheet-accent/40 bg-surface-container-low text-on-surface'
    : 'border-white/8 bg-surface-container-low text-on-surface-variant';

  const accentClass = variant === 'subclass'
    ? unlocked
      ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)] font-bold'
      : 'text-cyan-500/60'
    : unlocked
      ? 'text-sheet-accent'
      : 'text-sheet-accent-weak';

  return (
    <div className={`rounded border p-4 transition-colors ${baseClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.18em] ${accentClass}`}>
            {variant === 'subclass' ? (feature.subclassName || 'Subclasse') : 'Classe'}
          </p>
          <h4 className="mt-2 font-['Space_Grotesk'] text-base font-bold">{feature.name}</h4>
        </div>
        {unlocked ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant/40" />
        )}
      </div>
      {feature.description && (
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          {feature.description}
        </p>
      )}
    </div>
  );
}

/* ─── Option Card (for showing a single choosable / chosen option) ─── */
function OptionCard({ option, isChosen, isSelecting, onSelect, disabled, canChoose }) {
  return (
    <div
      className={`group relative rounded border p-4 transition-all duration-300 ${
        isChosen
          ? 'border-amber-400/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.12)] ring-1 ring-amber-400/20'
          : canChoose && !disabled
            ? 'border-white/10 bg-surface-container-high hover:border-amber-400/30 hover:bg-amber-500/5 cursor-pointer'
            : 'border-white/8 bg-surface-container-high'
      }`}
      onClick={() => {
        if (canChoose && !disabled && !isChosen && onSelect) onSelect(option.id);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h5 className={`font-['Space_Grotesk'] text-sm font-bold uppercase ${
            isChosen ? 'text-amber-300' : 'text-white'
          }`}>
            {option.name_pt || option.name}
          </h5>
          {option.summary && (
            <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
              {option.summary}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {isChosen ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/25 ring-1 ring-amber-400/40">
              <Check className="h-4 w-4 text-amber-300" />
            </div>
          ) : canChoose && !disabled ? (
            isSelecting ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-surface-container transition-colors group-hover:border-amber-400/30 group-hover:bg-amber-500/10">
                <Plus className="h-3.5 w-3.5 text-on-surface-variant/50 transition-colors group-hover:text-amber-300" />
              </div>
            )
          ) : (
            <Circle className="h-5 w-5 text-on-surface-variant/20" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Subclass Options Section ─── */
function SubclassOptionsSection({ character, progression }) {
  const { subclassOptions, choiceRules, charChoices, subclassId, currentLevel } = progression;
  const [selectingOptionId, setSelectingOptionId] = useState(null);
  const [localChoices, setLocalChoices] = useState(charChoices || []);

  useEffect(() => {
    setLocalChoices(charChoices || []);
  }, [charChoices]);

  // Group options by option_type
  const optionsByType = useMemo(() => {
    const map = {};
    (subclassOptions || []).forEach(opt => {
      if (!map[opt.option_type]) map[opt.option_type] = [];
      map[opt.option_type].push(opt);
    });
    return map;
  }, [subclassOptions]);

  // Group choice rules by option_type
  const rulesByType = useMemo(() => {
    const map = {};
    (choiceRules || []).forEach(rule => {
      const key = rule.option_type || 'general';
      if (!map[key]) map[key] = [];
      map[key].push(rule);
    });
    return map;
  }, [choiceRules]);

  // Build set of chosen option IDs
  const chosenOptionIds = useMemo(() => {
    return new Set((localChoices || []).map(c => c.option_id));
  }, [localChoices]);

  const handleSelectOption = async (optionId, ruleId, levelChosen) => {
    setSelectingOptionId(optionId);
    try {
      const { data, error } = await supabase
        .from('char_subclass_choices')
        .insert([{
          sheet_id: character.id,
          subclass_id: subclassId,
          option_id: optionId,
          level_chosen: levelChosen,
        }])
        .select('*, subclass_options(*)')
        .single();

      if (error) {
        console.error('Erro ao salvar escolha:', error);
        alert('Erro ao salvar escolha de subclasse.');
      } else {
        setLocalChoices(prev => [...prev, data]);
      }
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao comunicar com o servidor.');
    } finally {
      setSelectingOptionId(null);
    }
  };

  // Get unique option types
  const optionTypes = useMemo(() => {
    const types = new Set([
      ...Object.keys(optionsByType),
      ...Object.keys(rulesByType),
    ]);
    return Array.from(types);
  }, [optionsByType, rulesByType]);

  if (optionTypes.length === 0) return null;

  return (
    <section className="rounded border border-white/8 bg-surface-container p-6 space-y-6">
      <div>
        <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/70">
          Opções de Subclasse
        </p>
        <h4 className="mt-2 font-['Space_Grotesk'] text-xl font-black uppercase text-white">
          Escolhas Especiais
        </h4>
        <p className="mt-2 text-sm text-on-surface-variant">
          Habilidades que você pode personalizar conforme sobe de nível.
        </p>
      </div>

      {optionTypes.map(optionType => {
        const typeLabel = OPTION_TYPE_LABELS[optionType] || optionType.replace(/_/g, ' ');
        const TypeIcon = OPTION_TYPE_ICONS[optionType] || Sparkles;
        const options = optionsByType[optionType] || [];
        const rules = rulesByType[optionType] || [];

        // Calculate total picks allowed and total chosen for this type
        const unlockedRules = rules.filter(r => r.level_required <= currentLevel);
        const totalPicksAllowed = unlockedRules.reduce((sum, r) => sum + r.pick_count, 0);
        const chosenForType = localChoices.filter(c => {
          const opt = options.find(o => o.id === c.option_id);
          return !!opt;
        });
        const totalChosen = chosenForType.length;
        const slotsRemaining = totalPicksAllowed - totalChosen;

        // Find the latest unlocked rule to display choice text
        const latestRule = unlockedRules[unlockedRules.length - 1];

        // If no rules exist for this type, show as informational/passive picks (e.g. Transmuter's stone)
        const hasRules = rules.length > 0;
        const hasUnlockedRules = unlockedRules.length > 0;

        return (
          <div key={optionType} className="rounded border border-white/6 bg-surface-container-low/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-400/20">
                  <TypeIcon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h5 className="font-['Space_Grotesk'] text-base font-bold uppercase text-white">
                    {typeLabel}
                  </h5>
                  {hasRules && (
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {totalChosen} de {totalPicksAllowed} escolhidas
                      {slotsRemaining > 0 && hasUnlockedRules && (
                        <span className="text-amber-400 ml-1 font-semibold">
                          — {slotsRemaining} disponíveis
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {hasRules && hasUnlockedRules && (
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] ${
                  slotsRemaining > 0
                    ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/20'
                    : 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/20'
                }`}>
                  {slotsRemaining > 0 ? 'Pendente' : 'Completo'}
                </div>
              )}
            </div>

            {/* Progress bar */}
            {hasRules && totalPicksAllowed > 0 && (
              <div className="px-4 pt-3">
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      totalChosen >= totalPicksAllowed
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-amber-600 to-amber-400'
                    }`}
                    style={{ width: `${Math.min((totalChosen / totalPicksAllowed) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Choice rule breakdown by level */}
            {rules.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-2">
                {rules.map(rule => {
                  const isUnlocked = rule.level_required <= currentLevel;
                  return (
                    <div
                      key={rule.id}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                        isUnlocked
                          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-white/8 bg-surface-container text-on-surface-variant/50'
                      }`}
                    >
                      {isUnlocked ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      <span>Nv. {rule.level_required}: +{rule.pick_count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Options grid */}
            <div className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {options.map(option => {
                const isChosen = chosenOptionIds.has(option.id);
                const canChoose = hasUnlockedRules && slotsRemaining > 0 && !isChosen;

                return (
                  <OptionCard
                    key={option.id}
                    option={option}
                    isChosen={isChosen}
                    isSelecting={selectingOptionId === option.id}
                    disabled={selectingOptionId !== null}
                    canChoose={canChoose}
                    onSelect={(optionId) => {
                      const targetRule = unlockedRules[unlockedRules.length - 1];
                      handleSelectOption(optionId, targetRule?.id, currentLevel);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function ClasseTab({ character }) {
  const progression = character.classProgression;
  const [isSelectingSubclass, setIsSelectingSubclass] = useState(null);

  if (!progression?.classId) {
    return (
      <div className="mx-auto mt-8 max-w-4xl rounded border border-white/10 bg-surface-container p-8 text-center">
        <p className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.2em] text-sheet-accent-weak">
          Classe
        </p>
        <h3 className="mt-3 font-['Space_Grotesk'] text-2xl font-black">Sem classe vinculada</h3>
        <p className="mt-3 text-sm text-on-surface-variant">
          Esta ficha ainda não possui um registro em `char_class`.
        </p>
      </div>
    );
  }

  const classFeatures = [...(progression.classFeatures || [])].sort(levelSort);
  const subclasses = progression.subclasses || [];
  const selectedSubclass = subclasses.find((subclass) => subclass.isSelected) || null;
  const selectedSubclassFeatures = [...(selectedSubclass?.features || [])].sort(levelSort);
  const currentLevel = progression.currentLevel || character.level || 1;

  const allKnownLevels = [
    currentLevel,
    progression.subclassUnlockLevel || 0,
    ...classFeatures.map((feature) => feature.level || 0),
    ...selectedSubclassFeatures.map((feature) => feature.level || 0),
  ].filter(Boolean);

  const maxLevel = Math.max(...allKnownLevels, 1);
  const groupedClassFeatures = groupFeaturesByLevel(classFeatures);
  const groupedSubclassFeatures = groupFeaturesByLevel(selectedSubclassFeatures);
  const timelineLevels = Array.from({ length: maxLevel }, (_, index) => index + 1);
  const unknownClassFeatures = groupedClassFeatures.unknown || [];
  const unknownSubclassFeatures = groupedSubclassFeatures.unknown || [];

  const handleSelectSubclass = async (subclassId) => {
    setIsSelectingSubclass(subclassId);
    try {
      const { error } = await supabase
        .from('char_class')
        .update({ subclass_id: subclassId })
        .eq('sheet_id', character.id)
        .eq('class_id', progression.classId);
      
      if (error) {
        console.error('Erro ao escolher subclasse:', error);
        alert('Erro ao escolher subclasse.');
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao comunicar com o servidor.');
    } finally {
      setIsSelectingSubclass(null);
    }
  };

  const [classLevelsData, setClassLevelsData] = useState([]);
  const [spellSlotsData, setSpellSlotsData] = useState({});
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  useEffect(() => {
    async function fetchTableData() {
      if (!progression?.classId) return;
      setIsTableLoading(true);
      try {
        const [levelsRes, slotsRes] = await Promise.all([
          supabase.from('class_levels').select('*').eq('class_id', progression.classId).order('level'),
          supabase.from('spellcasting_slots').select('*').order('caster_level')
        ]);
        setClassLevelsData(levelsRes.data || []);
        
        const slotsMap = {};
        if (slotsRes.data) {
          slotsRes.data.forEach(s => {
            slotsMap[s.caster_level] = s;
          });
        }
        setSpellSlotsData(slotsMap);
      } catch (e) {
        console.error('Erro ao buscar tabela resumida', e);
      } finally {
        setIsTableLoading(false);
      }
    }
    fetchTableData();
  }, [progression?.classId]);

  // Determine which rule keys to display
  const ruleKeysToDisplay = new Set();
  let hasSpellcasting = false;
  classLevelsData.forEach(lvl => {
    if (lvl.rules_json) {
      Object.keys(lvl.rules_json).forEach(k => {
        if (k !== 'caster_level' && k !== 'spellcasting_progression') {
          ruleKeysToDisplay.add(k);
        }
        if (k === 'spellcasting_progression' || k === 'pact_slots') {
          hasSpellcasting = true;
        }
      });
    }
  });
  const dynamicColumns = Array.from(ruleKeysToDisplay).sort();

  // Check if this subclass has options to show
  const hasSubclassOptions = selectedSubclass && (progression.subclassOptions?.length > 0 || progression.choiceRules?.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-500">
      <section className="rounded border border-white/8 bg-surface-container p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.24em] text-sheet-accent-weak">
              Arvore de Progressão
            </p>
            <h3 className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase">
              {progression.className}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Veja o caminho da classe, quais características já foram liberadas e quais recursos ainda estão por vir.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Nivel Atual</p>
              <p className="mt-1 font-['Space_Grotesk'] text-2xl font-black text-white">{currentLevel}</p>
            </div>
            <div className="rounded border border-white/8 bg-surface-container-high px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sheet-accent-weak">Subclasse</p>
              <p className="mt-1 font-['Space_Grotesk'] text-sm font-black uppercase text-white">
                {selectedSubclass?.name || 'Não escolhida'}
              </p>
            </div>
            <div className="rounded border border-white/8 bg-surface-container-high px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sheet-accent-weak">Desbloqueio</p>
              <p className="mt-1 font-['Space_Grotesk'] text-sm font-black uppercase text-white">
                {progression.subclassUnlockLevel ? `Nivel ${progression.subclassUnlockLevel}` : 'Sem dado'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-xs text-on-surface-variant">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Liberado
          </span>
          <span className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4 text-on-surface-variant/40" />
            Futuro
          </span>
          <span className="inline-flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-cyan-400" />
            Caminho de subclasse
          </span>
        </div>
      </section>

      {/* Tabela do Livro do Jogador */}
      {classLevelsData.length > 0 && (
        <section className="rounded border border-white/8 bg-surface-container overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsTableExpanded(!isTableExpanded)}
          >
            <div className="flex items-center gap-3">
              <Table2 className="h-5 w-5 text-sheet-accent" />
              <div>
                <h4 className="font-['Space_Grotesk'] text-lg font-black uppercase text-white">
                  Tabela Resumo da Classe
                </h4>
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-0.5">
                  Baseado no Livro de Regras
                </p>
              </div>
            </div>
            <button className="p-2 text-on-surface-variant hover:text-white rounded-full transition-colors">
               {isTableExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {isTableExpanded && (
            <div className="overflow-x-auto border-t border-white/8 bg-surface-container-high/30">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase font-black tracking-[0.15em] text-on-surface-variant bg-surface-container-low">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap border-b border-white/8">Nível</th>
                    <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center">Prof.</th>
                    <th className="px-4 py-3 border-b border-white/8">Características</th>
                    {dynamicColumns.map(col => (
                      <th key={col} className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-amber-200">
                        {RULE_KEY_LABELS[col] || col.replace(/_/g, ' ')}
                      </th>
                    ))}
                    {hasSpellcasting && (
                      <>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">1º</th>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">2º</th>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">3º</th>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">4º</th>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">5º</th>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">6º</th>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">7º</th>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">8º</th>
                        <th className="px-4 py-3 whitespace-nowrap border-b border-white/8 text-center text-purple-300">9º</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {classLevelsData.map((row) => {
                    const profBonus = Math.ceil(row.level / 4) + 1;
                    const features = groupedClassFeatures[row.level] || [];
                    const featureNames = features.map(f => f.name).join(', ') || '-';
                    
                    const rules = row.rules_json || {};
                    let spellRow = null;
                    if (rules.caster_level && spellSlotsData[rules.caster_level]) {
                      spellRow = spellSlotsData[rules.caster_level];
                    }

                    return (
                      <tr 
                        key={row.level} 
                        className={`hover:bg-white/5 transition-colors ${row.level === currentLevel ? 'bg-sheet-accent/10 border-l-2 border-sheet-accent' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap font-black font-['Space_Grotesk']">
                          {row.level}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-emerald-300 font-bold">
                          +{profBonus}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant min-w-[200px]">
                          {featureNames}
                        </td>
                        {dynamicColumns.map(col => (
                          <td key={col} className="px-4 py-3 whitespace-nowrap text-center font-bold text-amber-100">
                            {rules[col] !== undefined ? formatRuleValue(col, rules[col]) : '-'}
                          </td>
                        ))}
                        {hasSpellcasting && (
                          <>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_1 || (rules.pact_slots > 0 && rules.pact_slot_level === 1 ? rules.pact_slots : '-')}</td>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_2 || (rules.pact_slots > 0 && rules.pact_slot_level === 2 ? rules.pact_slots : '-')}</td>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_3 || (rules.pact_slots > 0 && rules.pact_slot_level === 3 ? rules.pact_slots : '-')}</td>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_4 || (rules.pact_slots > 0 && rules.pact_slot_level === 4 ? rules.pact_slots : '-')}</td>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_5 || (rules.pact_slots > 0 && rules.pact_slot_level === 5 ? rules.pact_slots : '-')}</td>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_6 || '-'}</td>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_7 || '-'}</td>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_8 || '-'}</td>
                            <td className="px-4 py-3 text-center">{spellRow?.slot_9 || '-'}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {subclasses.length > 0 && (
        <section className="rounded border border-white/8 bg-surface-container p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.2em] text-sheet-accent-weak">
                Caminhos
              </p>
              <h4 className="mt-2 font-['Space_Grotesk'] text-xl font-black uppercase">Subclasses Disponíveis</h4>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
              {subclasses.length} opcoes
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {subclasses.map((subclass) => (
              <div
                key={subclass.id}
                className={`rounded border p-4 transition-all duration-300 ${
                  subclass.isSelected
                    ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400/20'
                    : 'border-white/8 bg-surface-container-high hover:border-cyan-400/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.18em] ${
                      subclass.isSelected ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'text-on-surface-variant'
                    }`}>
                      {subclass.isSelected ? 'Selecionada' : 'Disponível'}
                    </p>
                    <h5 className="mt-2 font-['Space_Grotesk'] text-lg font-bold uppercase text-white">
                      {subclass.name}
                    </h5>
                  </div>
                  {subclass.isSelected ? (
                    <Sparkles className="h-5 w-5 shrink-0 text-cyan-400 animate-pulse" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-on-surface-variant/30" />
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                  {subclass.description || 'Sem descrição cadastrada.'}
                </p>
                
                {!selectedSubclass && currentLevel >= (progression.subclassUnlockLevel || 1) && (
                  <button
                    onClick={() => handleSelectSubclass(subclass.id)}
                    disabled={isSelectingSubclass !== null}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-cyan-500/20 py-2.5 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 transition-all hover:bg-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:text-cyan-200 disabled:opacity-50"
                  >
                    {isSelectingSubclass === subclass.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MousePointerClick className="h-4 w-4" />
                    )}
                    Escolher Subclasse
                  </button>
                )}

                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  {subclass.features?.length || 0} características mapeadas
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Subclass Options (Maneuvers, Arcane Shots, etc.) ─── */}
      {hasSubclassOptions && (
        <SubclassOptionsSection character={character} progression={progression} />
      )}

      <section className="rounded border border-white/8 bg-surface-container p-6">
        <div className="mb-6">
          <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.2em] text-sheet-accent-weak">
            Linha do Tempo
          </p>
          <h4 className="mt-2 font-['Space_Grotesk'] text-xl font-black uppercase">Progressão por Nível</h4>
        </div>

        <div className="space-y-4">
          {(timelineLevels || []).map((level) => {
            const unlocked = level <= currentLevel;
            const levelClassFeatures = (groupedClassFeatures[level] || []).filter(f => !isRedundantFeature(f.name));
            const levelSubclassFeatures = (groupedSubclassFeatures[level] || []).filter(f => !isRedundantFeature(f.name));
            const showsSubclassChoice = progression.subclassUnlockLevel === level && subclasses.length > 0;

            if (levelClassFeatures.length === 0 && levelSubclassFeatures.length === 0 && !showsSubclassChoice) {
              return null;
            }

            return (
              <div
                key={level}
                className={`rounded border p-4 ${
                  unlocked ? 'border-sheet-accent/20 bg-surface-container-high' : 'border-white/8 bg-surface-container-low'
                }`}
              >
                <div className="flex flex-col gap-3 border-b border-white/6 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border font-['Space_Grotesk'] text-lg font-black ${
                      unlocked
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/10 bg-surface-container text-on-surface-variant'
                    }`}>
                      {level}
                    </div>
                    <div>
                      <p className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.16em] text-sheet-accent-weak">
                        Nivel {level}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {unlocked ? 'Características disponíveis agora.' : 'Próximo marco da progressão.'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                    {unlocked ? 'Desbloqueado' : 'Bloqueado'}
                  </div>
                </div>

                {showsSubclassChoice && (
                  <div className="mt-4 rounded border border-cyan-400/30 bg-cyan-500/10 p-4 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                    <p className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.18em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                      Escolha de Subclasse
                    </p>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {selectedSubclass
                        ? `O caminho atual segue por ${selectedSubclass.name}.`
                        : 'Neste nivel a classe libera a escolha de uma subclasse.'}
                    </p>
                  </div>
                )}

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {levelClassFeatures.map((feature) => (
                    <FeatureCard key={feature.id} feature={feature} unlocked={unlocked} />
                  ))}
                  {levelSubclassFeatures.map((feature) => (
                    <FeatureCard key={feature.id} feature={feature} unlocked={unlocked} variant="subclass" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {unknownClassFeatures.length + unknownSubclassFeatures.length > 0 && (
          <div className="mt-6 rounded border border-dashed border-white/10 bg-surface-container-low p-4">
            <p className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.18em] text-sheet-accent-weak">
              Sem nível definido
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {unknownClassFeatures.filter(f => !isRedundantFeature(f.name)).map((feature) => (
                <FeatureCard key={feature.id} feature={feature} unlocked={true} />
              ))}
              {unknownSubclassFeatures.filter(f => !isRedundantFeature(f.name)).map((feature) => (
                <FeatureCard key={feature.id} feature={feature} unlocked={!!selectedSubclass} variant="subclass" />
              ))}
            </div>
          </div>
        )}

        {classFeatures.length === 0 && selectedSubclassFeatures.length === 0 && (
          <div className="mt-6 rounded border border-amber-500/20 bg-amber-500/10 p-6 text-center">
            <p className="font-['Space_Grotesk'] text-sm font-black uppercase tracking-[0.1em] text-amber-300">
              Banco de Dados Incompleto
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              As características de classe e subclasse para este personagem não estão aparecendo porque a tabela <strong>class_features</strong> e <strong>subclass_features</strong> estão vazias no Supabase.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
