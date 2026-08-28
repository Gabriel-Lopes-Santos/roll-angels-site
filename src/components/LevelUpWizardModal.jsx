import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { XP_THRESHOLDS, canLevelUp, CLASS_HIT_DICE, MULTICLASS_REQUIREMENTS, getProficiencyBonus } from '../lib/levelProgression';
import { Loader2, X, ChevronRight, Check, Dices, List, Sparkles, BookOpen, Star, Beaker, Zap } from 'lucide-react';

// Tabbed Layout Wizard
export default function LevelUpWizardModal({ character, onClose, onComplete }) {
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('base');
  const [availableTabs, setAvailableTabs] = useState(['base']);
  
  // Data
  const [classes, setClasses] = useState([]);
  const [charClasses, setCharClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [hpType, setHpType] = useState('average');
  const [hpRoll, setHpRoll] = useState(null);
  
  // Features & Subclass
  const [features, setFeatures] = useState([]);
  const [needsSubclass, setNeedsSubclass] = useState(false);
  const [subclasses, setSubclasses] = useState([]);
  const [selectedSubclassId, setSelectedSubclassId] = useState('');
  const [previewSubclassFeatures, setPreviewSubclassFeatures] = useState([]);
  const [previewSubclassSpells, setPreviewSubclassSpells] = useState([]);

  // Spells
  const [needsSpells, setNeedsSpells] = useState(false);
  const [spellsToLearn, setSpellsToLearn] = useState({ cantrips: 0, spells: 0 });
  const [availableSpells, setAvailableSpells] = useState([]);
  const [selectedCantrips, setSelectedCantrips] = useState([]);
  const [selectedSpells, setSelectedSpells] = useState([]);
  
  // Choices & ASI
  const [choiceRules, setChoiceRules] = useState([]);
  const [optionsData, setOptionsData] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [needsAsi, setNeedsAsi] = useState(false);
  const [asiType, setAsiType] = useState('asi');
  const [asiStats, setAsiStats] = useState({ str:0, dex:0, con:0, int:0, wis:0, cha:0 });
  const [feats, setFeats] = useState([]);
  const [selectedFeatId, setSelectedFeatId] = useState('');

  const currentClassData = classes.find(c => c.id === selectedClassId) || {};
  const currentClassLevel = charClasses.find(c => c.class_id === selectedClassId)?.level || 0;
  const newClassLevel = currentClassLevel + 1;
  const newCharLevel = (character.level || 1) + 1;

  useEffect(() => {
    initWizard();
  }, []);

  useEffect(() => {
    if (selectedSubclassId && needsSubclass) {
      supabase.from('subclass_features')
        .select('*')
        .eq('subclass_id', selectedSubclassId)
        .eq('level_required', newClassLevel)
        .then(({ data }) => setPreviewSubclassFeatures(data || []));

      supabase.from('subclass_spells')
        .select('spell_id')
        .eq('subclass_id', selectedSubclassId)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const spellIds = data.map(d => d.spell_id);
            supabase.from('spells')
              .select('id, name, name_pt, level')
              .in('id', spellIds)
              .order('level')
              .order('name')
              .then(({ data: sp }) => setPreviewSubclassSpells(sp || []));
          } else {
            setPreviewSubclassSpells([]);
          }
        });
    } else {
      setPreviewSubclassFeatures([]);
      setPreviewSubclassSpells([]);
    }
  }, [selectedSubclassId, needsSubclass, newClassLevel]);

  const initWizard = async () => {
    setLoading(true);
    
    // Fetch char classes
    const { data: ccData } = await supabase.from('char_class').select('*').eq('sheet_id', character.id);
    setCharClasses(ccData || []);
    
    // Fetch all classes for multiclass dropdown
    const { data: cData } = await supabase.from('classes').select('*').order('name');
    setClasses(cData || []);
    
    // Determine default class to level up (the one they have highest level, or first one)
    if (ccData && ccData.length > 0) {
      const highest = ccData.reduce((prev, current) => (prev.level > current.level) ? prev : current);
      setSelectedClassId(highest.class_id);
      await loadFeaturesForClass(highest.class_id, ccData);
    } else {
      setLoading(false);
    }
  };

  const loadFeaturesForClass = async (clsId, ccDataArray) => {
    const cc = ccDataArray.find(c => c.class_id === clsId) || { level: 0 };
    const ncLevel = cc.level + 1;
    let tabs = ['base'];

    // 1. Fetch Class Features
    const { data: fts } = await supabase.from('class_features')
      .select('*')
      .eq('class_id', clsId)
      .eq('level_required', ncLevel);
      
    let allFeatures = fts || [];
    
    // 2. Fetch Subclass Features (if they have one)
    if (cc.subclass_id) {
      const { data: subFts } = await supabase.from('subclass_features')
        .select('*')
        .eq('subclass_id', cc.subclass_id)
        .eq('level_required', ncLevel);
      if (subFts) allFeatures = [...allFeatures, ...subFts];
    }
    setFeatures(allFeatures);

    // Check Subclass Unlock
    const unlockRule = allFeatures.find(f => f.rules_json?.type === 'subclass_unlock' || f.rules_json?.type === 'subclass_selection');
    if (unlockRule) {
      setNeedsSubclass(true);
      tabs.push('subclass');
      const { data: subData } = await supabase.from('subclasses').select('*').eq('class_id', clsId);
      setSubclasses(subData || []);
    } else {
      setNeedsSubclass(false);
    }

    // Check ASI
    const asiRule = allFeatures.find(f => f.rules_json?.type === 'choice' && f.rules_json?.choice_kind === 'asi_or_feat');
    if (asiRule) {
      setNeedsAsi(true);
      if (!tabs.includes('choices')) tabs.push('choices');
      const { data: fsData } = await supabase.from('feats').select('*').order('name');
      setFeats(fsData || []);
    } else {
      setNeedsAsi(false);
    }

    // Check Spells
    const { data: lvls } = await supabase.from('class_levels').select('*').eq('class_id', clsId).in('level', [cc.level, ncLevel]);
    const prevLvlData = lvls?.find(l => l.level === cc.level) || { cantrips_known: 0, spells_known: 0 };
    const curLvlData = lvls?.find(l => l.level === ncLevel) || { cantrips_known: 0, spells_known: 0 };
    
    const cantripsGained = (curLvlData.cantrips_known || 0) - (prevLvlData.cantrips_known || 0);
    const spellsGained = (curLvlData.spells_known || 0) - (prevLvlData.spells_known || 0);

    if (cantripsGained > 0 || spellsGained > 0) {
      setNeedsSpells(true);
      tabs.push('spells');
      setSpellsToLearn({ cantrips: cantripsGained, spells: spellsGained });
      
      const { data: spellList } = await supabase.from('class_spells').select('spell_id').eq('class_id', clsId);
      if (spellList && spellList.length > 0) {
        const spellIds = spellList.map(s => s.spell_id);
        const { data: spellData } = await supabase.from('spells').select('*').in('id', spellIds).order('level').order('name');
        setAvailableSpells(spellData || []);
      }
    } else {
      setNeedsSpells(false);
      setSpellsToLearn({ cantrips: 0, spells: 0 });
      setAvailableSpells([]);
    }
    setSelectedCantrips([]);
    setSelectedSpells([]);

    // Choices
    const { data: cr } = await supabase.from('class_choice_rules').select('*').eq('class_id', clsId).eq('level_required', ncLevel);
    let allChoiceRules = cr || [];
    
    if (cc.subclass_id) {
       const { data: subCr } = await supabase.from('subclass_choice_rules').select('*').eq('subclass_id', cc.subclass_id).eq('level_required', ncLevel);
       if (subCr) allChoiceRules = [...allChoiceRules, ...subCr];
    }
    setChoiceRules(allChoiceRules);

    if (allChoiceRules.length > 0) {
      if (!tabs.includes('choices')) tabs.push('choices');
      const classOptionTypes = allChoiceRules.filter(c => c.class_id).map(c => c.option_type);
      const subOptionTypes = allChoiceRules.filter(c => c.subclass_id).map(c => c.option_type);
      
      let allOptions = [];
      if (classOptionTypes.length > 0) {
         const { data: opts } = await supabase.from('class_options').select('*').eq('class_id', clsId).in('option_type', classOptionTypes);
         if (opts) allOptions = [...allOptions, ...opts];
      }
      if (subOptionTypes.length > 0 && cc.subclass_id) {
         const { data: subOpts } = await supabase.from('subclass_options').select('*').eq('subclass_id', cc.subclass_id).in('option_type', subOptionTypes);
         if (subOpts) allOptions = [...allOptions, ...subOpts];
      }
      
      const optsMap = {};
      allChoiceRules.forEach(rule => { optsMap[rule.option_type] = allOptions.filter(o => o.option_type === rule.option_type); });
      setOptionsData(optsMap);
      setSelectedOptions({});
    }

    setAvailableTabs(tabs);
    setActiveTab('base');
    setHpRoll(null);
    setHpType('average');
    setLoading(false);
  };

  const handleSelectClass = async (clsId) => {
    setLoading(true);
    await loadFeaturesForClass(clsId, charClasses);
  };

  const handleRollHp = () => {
    if (hpRoll) return;
    const maxDie = CLASS_HIT_DICE[selectedClassId] || 8;
    const roll = Math.floor(Math.random() * maxDie) + 1;
    setHpRoll(roll);
  };

  const getConMod = () => Math.floor((character.attributes.con - 10) / 2);
  const getAverageHp = () => Math.floor((CLASS_HIT_DICE[selectedClassId] || 8) / 2) + 1;
  const calculateAddedHp = () => hpType === 'average' ? getAverageHp() + getConMod() : (hpRoll || 0) + getConMod();

  const handleFinish = async () => {
    if (hpType === 'roll' && !hpRoll) return alert('Você escolheu rolar o dado. Por favor, role-o na aba Base.');
    if (needsSubclass && !selectedSubclassId) return alert('Selecione uma subclasse.');
    
    if (needsSpells) {
      if (selectedCantrips.length !== spellsToLearn.cantrips) return alert(`Selecione ${spellsToLearn.cantrips} truques na aba de Magias.`);
      if (selectedSpells.length !== spellsToLearn.spells) return alert(`Selecione ${spellsToLearn.spells} magias na aba de Magias.`);
    }

    if (needsAsi) {
      if (asiType === 'asi') {
        const total = asiStats.str + asiStats.dex + asiStats.con + asiStats.int + asiStats.wis + asiStats.cha;
        if (total !== 2) return alert('Distribua exatamente 2 pontos de atributo.');
      } else {
        if (!selectedFeatId) return alert('Selecione um talento.');
      }
    }
    
    for (const rule of choiceRules) {
      const picks = selectedOptions[rule.choice_key] || [];
      if (picks.length !== rule.pick_count) return alert(`Complete a escolha de ${rule.choice_text} na aba Escolhas/Talentos`);
    }

    setLoading(true);
    try {
      // 1. Update/Insert Class
      if (charClasses.some(c => c.class_id === selectedClassId)) {
        await supabase.from('char_class')
          .update({ level: newClassLevel, subclass_id: selectedSubclassId || currentClassData.subclass_id })
          .eq('sheet_id', character.id)
          .eq('class_id', selectedClassId);
      } else {
        await supabase.from('char_class').insert({
          sheet_id: character.id,
          class_id: selectedClassId,
          level: 1,
          subclass_id: selectedSubclassId || null
        });
      }

      // 2. Update Stats
      let updateData = {
        level: newCharLevel,
        exp: character.exp,
        hit_points_max: character.stats.hpMax + calculateAddedHp(),
        hit_points: character.stats.hpCurrent + calculateAddedHp(),
        proficiency_bonus: getProficiencyBonus(newCharLevel)
      };

      if (needsAsi && asiType === 'asi') {
        updateData.base_str = character.baseStats.base_str + asiStats.str;
        updateData.str = character.attributes.str + asiStats.str;
        updateData.base_dex = character.baseStats.base_dex + asiStats.dex;
        updateData.dex = character.attributes.dex + asiStats.dex;
        updateData.base_con = character.baseStats.base_con + asiStats.con;
        updateData.con = character.attributes.con + asiStats.con;
        updateData.base_int = character.baseStats.base_int + asiStats.int;
        updateData.int = character.attributes.int + asiStats.int;
        updateData.base_wis = character.baseStats.base_wis + asiStats.wis;
        updateData.wis = character.attributes.wis + asiStats.wis;
        updateData.base_cha = character.baseStats.base_cha + asiStats.cha;
        updateData.cha = character.attributes.cha + asiStats.cha;
      }
      await supabase.from('char_sheet').update(updateData).eq('id', character.id);

      // 3. Feats
      if (needsAsi && asiType === 'feat') {
        await supabase.from('char_feats').insert({ sheet_id: character.id, feat_id: selectedFeatId, acquired_at_level: newCharLevel });
      }

      // 4. Choices
      for (const rule of choiceRules) {
        const picks = selectedOptions[rule.choice_key] || [];
        for (const pickId of picks) {
          if (rule.class_id) {
            await supabase.from('char_class_choices').insert({ sheet_id: character.id, class_id: selectedClassId, level_acquired: newClassLevel, choice_key: rule.choice_key, option_id: pickId });
          } else if (rule.subclass_id) {
            await supabase.from('char_subclass_choices').insert({ sheet_id: character.id, subclass_id: rule.subclass_id, option_id: pickId, level_chosen: newClassLevel });
          }
        }
      }

      // 5. Spells
      if (needsSpells) {
        for (const sid of selectedCantrips) {
          await supabase.from('char_cantrips').insert({ sheet_id: character.id, spell_id: sid, source: currentClassData.name });
        }
        for (const sid of selectedSpells) {
          await supabase.from('char_spells_known').insert({ sheet_id: character.id, spell_id: sid, source: currentClassData.name });
        }
      }

      onComplete();
    } catch (err) {
      console.error(err);
      alert('Erro ao evoluir: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTabIcon = (tab) => {
    if (tab === 'base') return <List className="w-5 h-5" />;
    if (tab === 'subclass') return <Star className="w-5 h-5" />;
    if (tab === 'spells') return <BookOpen className="w-5 h-5" />;
    if (tab === 'choices') return <Zap className="w-5 h-5" />;
  };
  
  const getTabName = (tab) => {
    if (tab === 'base') return 'Base';
    if (tab === 'subclass') return 'Subclasse';
    if (tab === 'spells') return 'Magias';
    if (tab === 'choices') return 'Escolhas / Talentos';
  };

  const getSubclassSpellClassLevel = (className, spellLevel) => {
    if (spellLevel === 0) return 1;
    className = className?.toLowerCase() || '';
    if (['paladin', 'ranger', 'artificer'].includes(className)) {
      if (spellLevel === 1) return 3;
      if (spellLevel === 2) return 5;
      if (spellLevel === 3) return 9;
      if (spellLevel === 4) return 13;
      if (spellLevel === 5) return 17;
    } else {
      if (spellLevel === 1) return 1;
      if (spellLevel === 2) return 3;
      if (spellLevel === 3) return 5;
      if (spellLevel === 4) return 7;
      if (spellLevel === 5) return 9;
    }
    return '?';
  };

  const toggleSpellPick = (spell, isCantrip) => {
    if (isCantrip) {
      if (selectedCantrips.includes(spell.id)) {
        setSelectedCantrips(selectedCantrips.filter(id => id !== spell.id));
      } else {
        if (selectedCantrips.length >= spellsToLearn.cantrips) return;
        setSelectedCantrips([...selectedCantrips, spell.id]);
      }
    } else {
      if (selectedSpells.includes(spell.id)) {
        setSelectedSpells(selectedSpells.filter(id => id !== spell.id));
      } else {
        if (selectedSpells.length >= spellsToLearn.spells) return;
        setSelectedSpells([...selectedSpells, spell.id]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface-container-highest w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh] border border-white/10 relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-neutral-400 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        {loading && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-sheet-accent">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <span className="font-bold tracking-widest uppercase text-sm">Processando Nível...</span>
          </div>
        )}

        {/* SIDEBAR TABS */}
        <div className="w-full md:w-64 bg-surface-container border-b md:border-b-0 md:border-r border-white/10 flex flex-col flex-shrink-0">
          <div className="p-6 pb-2">
            <h2 className="text-xl font-black text-sheet-accent tracking-tighter flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl">upgrade</span>
              EVOLUÇÃO
            </h2>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-bold">Nível {newCharLevel}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {availableTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-sm ${isActive ? 'bg-sheet-accent text-surface-container-highest shadow-lg scale-105' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {getTabIcon(tab)}
                  {getTabName(tab)}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col h-full bg-surface-container-highest overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 sheet-themed-scroll">
            
            {/* TAB: BASE */}
            {activeTab === 'base' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface-container p-6 rounded-2xl border border-white/5 shadow-inner gap-4">
                  <div>
                    <p className="text-xs font-bold text-neutral-500 tracking-widest uppercase mb-1">Classe a Evoluir</p>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                      {currentClassData.name_pt || currentClassData.name} <span className="text-sheet-accent">({newClassLevel}º)</span>
                    </h3>
                  </div>
                  <div className="w-full sm:w-auto">
                    <select 
                      value={selectedClassId || ''} 
                      onChange={(e) => handleSelectClass(parseInt(e.target.value))}
                      className="w-full sm:w-auto bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-neutral-300 focus:outline-none focus:border-sheet-accent"
                    >
                      <option disabled>Evoluir Classe Atual...</option>
                      {charClasses.map(cc => {
                        const cls = classes.find(c => c.id === cc.class_id);
                        return <option key={cc.class_id} value={cc.class_id}>{cls?.name_pt || cls?.name} ({'-> Nível '}{cc.level + 1})</option>;
                      })}
                      <option disabled>Multiclasse...</option>
                      {classes.filter(c => !charClasses.some(cc => cc.class_id === c.id)).map(cls => {
                        const canMC = MULTICLASS_REQUIREMENTS[cls.id] ? MULTICLASS_REQUIREMENTS[cls.id](character.attributes) : true;
                        return <option key={cls.id} value={cls.id} disabled={!canMC}>{cls.name_pt || cls.name} {canMC ? '' : '(Requisitos não atingidos)'}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400">favorite</span>
                    Aumento de Pontos de Vida (Dado: d{CLASS_HIT_DICE[selectedClassId] || 8})
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-colors flex flex-col items-center text-center ${hpType === 'average' ? 'border-sheet-accent bg-sheet-accent/10' : 'border-surface-container-highest hover:bg-white/5'}`}>
                      <input type="radio" name="hpType" checked={hpType === 'average'} onChange={() => setHpType('average')} className="hidden" />
                      <span className="font-bold text-white uppercase text-sm mb-1">Média Fixa</span>
                      <span className="text-xs text-neutral-400">Ganha {getAverageHp()} + {getConMod()} (CON) = <b className="text-white text-lg">{getAverageHp() + getConMod()}</b> HP</span>
                    </label>
                    
                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-colors flex flex-col items-center text-center ${hpType === 'roll' ? 'border-sheet-accent bg-sheet-accent/10' : 'border-surface-container-highest hover:bg-white/5'}`}>
                      <input type="radio" name="hpType" checked={hpType === 'roll'} onChange={() => { setHpType('roll'); }} className="hidden" />
                      <span className="font-bold text-white uppercase text-sm mb-1">Rolar o Dado</span>
                      <div className="text-xs text-neutral-400 mt-2">
                        {hpRoll ? (
                          <>Rolado: <b>{hpRoll}</b> + {getConMod()} (CON) = <b className="text-white text-lg">{hpRoll + getConMod()}</b> HP</>
                        ) : (
                          hpType === 'roll' ? (
                            <button onClick={handleRollHp} className="w-full py-2 px-4 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center gap-2 font-bold uppercase text-[10px]">
                              <Dices className="w-4 h-4" /> Rolar 1d{CLASS_HIT_DICE[selectedClassId] || 8} Agora
                            </button>
                          ) : (
                            'Role o d' + (CLASS_HIT_DICE[selectedClassId] || 8) + ' (Apenas 1 chance!)'
                          )
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-surface-container-low p-6 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-neutral-200 mb-4 uppercase tracking-widest text-xs opacity-70">Características Recebidas Base</h4>
                  {features.filter(f => f.rules_json?.type !== 'subclass_unlock' && f.rules_json?.type !== 'subclass_selection' && f.rules_json?.choice_kind !== 'asi_or_feat').length === 0 ? (
                    <p className="text-neutral-500 text-sm">Nenhuma característica base nova neste nível.</p>
                  ) : (
                    <ul className="space-y-4">
                      {features.filter(f => f.rules_json?.type !== 'subclass_unlock' && f.rules_json?.type !== 'subclass_selection' && f.rules_json?.choice_kind !== 'asi_or_feat').map(f => (
                        <li key={f.id} className="border-l-2 border-sheet-accent pl-4">
                          <span className="block font-bold text-sm text-white mb-1">{f.name_pt || f.name}</span>
                          <span className="block text-xs text-neutral-400">{f.summary}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* TAB: SUBCLASS */}
            {activeTab === 'subclass' && needsSubclass && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter border-b border-white/10 pb-4">Escolha de Subclasse</h3>
                <div className="bg-surface-container-low p-6 rounded-2xl border border-cyan-500/30">
                  <p className="text-sm text-neutral-400 mb-4">Seu caminho se especializa. Escolha com sabedoria, pois isto definirá suas futuras habilidades.</p>
                  <select 
                    value={selectedSubclassId} 
                    onChange={(e) => setSelectedSubclassId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="" disabled>-- Selecione sua Subclasse --</option>
                    {subclasses.map(s => (
                      <option key={s.id} value={s.id}>{s.name_pt || s.name}</option>
                    ))}
                  </select>
                </div>
                {selectedSubclassId && (
                  <div className="bg-surface-container p-6 rounded-2xl border border-white/5 space-y-6">
                     <div>
                       <h4 className="font-bold text-cyan-400 mb-3 uppercase tracking-widest text-xs">O que você ganha agora</h4>
                       {previewSubclassFeatures.length === 0 ? (
                         <p className="text-sm text-neutral-400 italic">Nenhuma característica nova neste nível específico, ou elas são passivas (como liberar expansão de magias).</p>
                       ) : (
                         <ul className="space-y-4">
                           {previewSubclassFeatures.map(f => (
                             <li key={f.id} className="border-l-2 border-cyan-500 pl-4">
                               <span className="block font-bold text-sm text-white mb-1">{f.name_pt || f.name}</span>
                               <span className="block text-xs text-neutral-400">{f.summary}</span>
                             </li>
                           ))}
                         </ul>
                       )}
                     </div>

                     {previewSubclassSpells.length > 0 && (
                       <div>
                         <h4 className="font-bold text-cyan-400 mb-3 uppercase tracking-widest text-xs">Magias Garantidas pela Subclasse</h4>
                         <p className="text-xs text-neutral-400 mb-4">Estas magias estarão sempre preparadas ou serão adicionadas à sua lista de magias conhecidas assim que você tiver nível suficiente em slots de magia para lançá-las.</p>
                         <div className="flex flex-col gap-3">
                           {Array.from(new Set(previewSubclassSpells.map(s => s.level))).sort((a,b) => a-b).map(lvl => (
                             <div key={lvl} className="bg-black/40 rounded-xl p-3 border border-white/5">
                               <span className="block text-[10px] uppercase font-bold text-neutral-500 mb-2">
                                 {lvl === 0 ? 'Truques (Libera no Nível 1)' : `Nível de ${currentClassData.name_pt || currentClassData.name} ${getSubclassSpellClassLevel(currentClassData.name, lvl)} (Magias de Nível ${lvl})`}
                               </span>
                               <div className="flex flex-wrap gap-2">
                                 {previewSubclassSpells.filter(s => s.level === lvl).map(spell => (
                                   <span key={spell.id} className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded text-xs font-bold">
                                     {spell.name_pt || spell.name}
                                   </span>
                                 ))}
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SPELLS */}
            {activeTab === 'spells' && needsSpells && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Aprendizado Mágico</h3>
                </div>
                
                {spellsToLearn.cantrips > 0 && (
                  <div className="bg-surface-container-low p-6 rounded-2xl border border-blue-500/30">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-blue-400 uppercase tracking-widest text-xs">Novos Truques (Nível 0)</h4>
                      <span className="bg-black/50 px-3 py-1 text-xs font-bold rounded-lg text-neutral-300">
                        Selecionados: <span className={selectedCantrips.length === spellsToLearn.cantrips ? 'text-green-400' : 'text-blue-400'}>{selectedCantrips.length}</span> / {spellsToLearn.cantrips}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2 sheet-themed-scroll">
                      {availableSpells.filter(s => s.level === 0).map(spell => {
                        const isSel = selectedCantrips.includes(spell.id);
                        return (
                          <button key={spell.id} onClick={() => toggleSpellPick(spell, true)} className={`text-left p-3 rounded-xl border transition-all flex flex-col ${isSel ? 'bg-blue-500/20 border-blue-400' : 'bg-black/40 border-white/5 hover:bg-white/10'}`}>
                            <span className="font-bold text-sm text-white">{spell.name_pt || spell.name}</span>
                            <span className="text-[10px] text-neutral-500 mt-1 line-clamp-2">{spell.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {spellsToLearn.spells > 0 && (
                  <div className="bg-surface-container-low p-6 rounded-2xl border border-purple-500/30">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-purple-400 uppercase tracking-widest text-xs">Novas Magias Conhecidas</h4>
                      <span className="bg-black/50 px-3 py-1 text-xs font-bold rounded-lg text-neutral-300">
                        Selecionadas: <span className={selectedSpells.length === spellsToLearn.spells ? 'text-green-400' : 'text-purple-400'}>{selectedSpells.length}</span> / {spellsToLearn.spells}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2 sheet-themed-scroll">
                      {availableSpells.filter(s => s.level > 0).map(spell => {
                        const isSel = selectedSpells.includes(spell.id);
                        return (
                          <button key={spell.id} onClick={() => toggleSpellPick(spell, false)} className={`text-left p-3 rounded-xl border transition-all flex flex-col ${isSel ? 'bg-purple-500/20 border-purple-400' : 'bg-black/40 border-white/5 hover:bg-white/10'}`}>
                            <div className="flex justify-between items-start w-full">
                              <span className="font-bold text-sm text-white">{spell.name_pt || spell.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 text-purple-300">Nível {spell.level}</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 mt-1 line-clamp-2">{spell.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: CHOICES & ASI */}
            {activeTab === 'choices' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter border-b border-white/10 pb-4">Escolhas e Talentos</h3>
                
                {needsAsi && (
                  <div className="bg-surface-container-low p-6 rounded-2xl border border-amber-500/30">
                    <h4 className="font-bold text-amber-400 mb-4 uppercase tracking-widest text-xs">Aprimoramento de Atributo</h4>
                    <div className="flex gap-4 mb-6">
                      <label className={`flex-1 text-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${asiType === 'asi' ? 'bg-amber-500/20 border-amber-400' : 'bg-black/30 border-white/10 hover:bg-white/5'}`}>
                        <input type="radio" className="hidden" checked={asiType === 'asi'} onChange={() => setAsiType('asi')} />
                        <span className="font-bold text-sm text-neutral-200 uppercase">+2 em Atributos</span>
                      </label>
                      <label className={`flex-1 text-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${asiType === 'feat' ? 'bg-amber-500/20 border-amber-400' : 'bg-black/30 border-white/10 hover:bg-white/5'}`}>
                        <input type="radio" className="hidden" checked={asiType === 'feat'} onChange={() => setAsiType('feat')} />
                        <span className="font-bold text-sm text-neutral-200 uppercase">Escolher Talento</span>
                      </label>
                    </div>

                    {asiType === 'asi' && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(st => (
                          <div key={st} className="flex flex-col bg-black/50 p-4 rounded-xl items-center border border-white/5">
                            <span className="uppercase text-xs font-bold text-neutral-400 mb-2">{st} ({character.attributes[st] + asiStats[st]})</span>
                            <div className="flex items-center gap-3">
                              <button onClick={() => setAsiStats({...asiStats, [st]: Math.max(0, asiStats[st]-1)})} className="text-neutral-400 hover:text-white w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-lg transition-colors">-</button>
                              <span className="text-white font-bold w-6 text-center text-lg">{asiStats[st]}</span>
                              <button onClick={() => setAsiStats({...asiStats, [st]: asiStats[st]+1})} className="text-neutral-400 hover:text-white w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-lg transition-colors">+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {asiType === 'feat' && (
                      <select 
                        value={selectedFeatId} 
                        onChange={(e) => setSelectedFeatId(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-amber-400"
                      >
                        <option value="">-- Selecione o Talento --</option>
                        {feats.map(f => (
                          <option key={f.id} value={f.id}>{f.name_pt || f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {choiceRules.map(rule => {
                  const opts = optionsData[rule.option_type] || [];
                  const currentPicks = selectedOptions[rule.choice_key] || [];
                  const togglePick = (optId) => {
                    let newPicks = [...currentPicks];
                    if (newPicks.includes(optId)) {
                      newPicks = newPicks.filter(id => id !== optId);
                    } else {
                      if (newPicks.length >= rule.pick_count) newPicks.shift();
                      newPicks.push(optId);
                    }
                    setSelectedOptions({...selectedOptions, [rule.choice_key]: newPicks});
                  };

                  return (
                    <div key={rule.id} className="bg-surface-container-low p-6 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <h4 className="font-bold text-sheet-accent uppercase tracking-widest text-xs">{rule.choice_text}</h4>
                        <span className="text-xs font-bold text-neutral-400">{currentPicks.length} / {rule.pick_count} selecionados</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2 sheet-themed-scroll">
                        {opts.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => togglePick(opt.id)}
                            className={`p-4 text-left rounded-xl transition-all border flex flex-col ${currentPicks.includes(opt.id) ? 'bg-sheet-accent/20 border-sheet-accent' : 'bg-black/40 border-white/5 hover:bg-white/10'}`}
                          >
                            <span className="block font-bold text-sm text-neutral-100">{opt.name_pt || opt.name}</span>
                            <span className="block text-[11px] text-neutral-400 mt-1 leading-relaxed">{opt.summary}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="bg-surface-container p-4 border-t border-white/10 flex justify-between items-center shrink-0">
            <div>
              {activeTab !== availableTabs[0] && (
                <button 
                  onClick={() => setActiveTab(availableTabs[availableTabs.indexOf(activeTab) - 1])}
                  className="px-6 py-2.5 text-neutral-400 hover:text-white font-bold rounded-xl transition-colors"
                >
                  Anterior
                </button>
              )}
            </div>
            
            {activeTab !== availableTabs[availableTabs.length - 1] ? (
              <button 
                onClick={() => setActiveTab(availableTabs[availableTabs.indexOf(activeTab) + 1])}
                className="px-8 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors shadow-lg"
              >
                Próximo
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                className="px-8 py-2.5 bg-sheet-accent text-surface-container-highest font-bold rounded-xl hover:brightness-110 transition-colors shadow-lg flex items-center gap-2"
              >
                Finalizar Evolução <Check className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
