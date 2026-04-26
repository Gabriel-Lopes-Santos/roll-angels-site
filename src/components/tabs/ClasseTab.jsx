import { CheckCircle2, Circle, GitBranch, Lock, Sparkles, Loader2, MousePointerClick, Table2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const levelSort = (a, b) => {
  const left = a.level ?? Number.MAX_SAFE_INTEGER;
  const right = b.level ?? Number.MAX_SAFE_INTEGER;
  return left - right || a.name.localeCompare(b.name, 'pt-BR');
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
  lay_on_hands_pool: 'Cura por Imposição',
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

function FeatureCard({ feature, unlocked, variant = 'class' }) {
  const baseClass = unlocked
    ? 'border-sheet-accent/40 bg-sheet-accent-subtle text-on-surface'
    : 'border-white/8 bg-surface-container-low text-on-surface-variant';

  const accentClass = variant === 'subclass'
    ? unlocked
      ? 'text-amber-300'
      : 'text-amber-500/60'
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
          Esta ficha ainda nao possui um registro em `char_class`.
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-500">
      <section className="rounded border border-white/8 bg-surface-container p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.24em] text-sheet-accent-weak">
              Arvore de Progressao
            </p>
            <h3 className="mt-2 font-['Space_Grotesk'] text-3xl font-black uppercase">
              {progression.className}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Veja o caminho da classe, quais caracteristicas ja foram liberadas e quais recursos ainda estao por vir.
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
                {selectedSubclass?.name || 'Nao escolhida'}
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
            <GitBranch className="h-4 w-4 text-amber-300" />
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
              <h4 className="mt-2 font-['Space_Grotesk'] text-xl font-black uppercase">Subclasses Disponiveis</h4>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
              {subclasses.length} opcoes
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {subclasses.map((subclass) => (
              <div
                key={subclass.id}
                className={`rounded border p-4 ${
                  subclass.isSelected
                    ? 'border-amber-400/40 bg-amber-500/10'
                    : 'border-white/8 bg-surface-container-high'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.18em] ${
                      subclass.isSelected ? 'text-amber-300' : 'text-on-surface-variant'
                    }`}>
                      {subclass.isSelected ? 'Selecionada' : 'Disponivel'}
                    </p>
                    <h5 className="mt-2 font-['Space_Grotesk'] text-lg font-bold uppercase text-white">
                      {subclass.name}
                    </h5>
                  </div>
                  {subclass.isSelected ? (
                    <Sparkles className="h-5 w-5 shrink-0 text-amber-300" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-on-surface-variant/30" />
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                  {subclass.description || 'Sem descricao cadastrada.'}
                </p>
                
                {!selectedSubclass && currentLevel >= (progression.subclassUnlockLevel || 1) && (
                  <button
                    onClick={() => handleSelectSubclass(subclass.id)}
                    disabled={isSelectingSubclass !== null}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-amber-500/20 py-2.5 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.18em] text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
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
                  {subclass.features?.length || 0} caracteristicas mapeadas
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded border border-white/8 bg-surface-container p-6">
        <div className="mb-6">
          <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-[0.2em] text-sheet-accent-weak">
            Linha do Tempo
          </p>
          <h4 className="mt-2 font-['Space_Grotesk'] text-xl font-black uppercase">Progressao por Nivel</h4>
        </div>

        <div className="space-y-4">
          {timelineLevels.map((level) => {
            const unlocked = level <= currentLevel;
            const levelClassFeatures = groupedClassFeatures[level] || [];
            const levelSubclassFeatures = groupedSubclassFeatures[level] || [];
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
                        {unlocked ? 'Caracteristicas disponiveis agora.' : 'Proximo marco da progressao.'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                    {unlocked ? 'Desbloqueado' : 'Bloqueado'}
                  </div>
                </div>

                {showsSubclassChoice && (
                  <div className="mt-4 rounded border border-amber-400/20 bg-amber-500/10 p-4">
                    <p className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-[0.18em] text-amber-300">
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
              Sem nivel definido
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {unknownClassFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} unlocked={true} />
              ))}
              {unknownSubclassFeatures.map((feature) => (
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
