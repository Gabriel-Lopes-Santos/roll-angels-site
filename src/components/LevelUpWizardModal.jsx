import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { XP_THRESHOLDS, canLevelUp, CLASS_HIT_DICE, MULTICLASS_REQUIREMENTS, getProficiencyBonus } from '../lib/levelProgression';
import { Loader2, X, ChevronRight, Check, Dices } from 'lucide-react';

export default function LevelUpWizardModal({ character, onClose, onComplete }) {
  const [step, setStep] = useState(0); // 0: HP/Overview (default), -1: Multiclass Select
  const [loading, setLoading] = useState(true);
  
  // Data
  const [classes, setClasses] = useState([]);
  const [charClasses, setCharClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  
  const [hpType, setHpType] = useState('average');
  const [hpRoll, setHpRoll] = useState(null);
  
  // Features & Choices
  const [features, setFeatures] = useState([]);
  
  const [subclasses, setSubclasses] = useState([]);
  const [needsSubclass, setNeedsSubclass] = useState(false);
  const [selectedSubclassId, setSelectedSubclassId] = useState('');
  
  const [choiceRules, setChoiceRules] = useState([]);
  const [optionsData, setOptionsData] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({}); // { ruleKey: [optionId, optionId] }
  
  const [needsAsi, setNeedsAsi] = useState(false);
  const [asiType, setAsiType] = useState('asi'); // 'asi' or 'feat'
  const [asiStats, setAsiStats] = useState({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }); 
  const [feats, setFeats] = useState([]);
  const [selectedFeatId, setSelectedFeatId] = useState('');
  
  const newCharLevel = (character?.level || 1) + 1;

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: clsData } = await supabase.from('classes').select('*').order('name', { ascending: true });
      setClasses(clsData || []);
      
      const { data: ccData } = await supabase.from('char_class').select('*').eq('sheet_id', character.id);
      setCharClasses(ccData || []);
      
      const { data: fData } = await supabase.from('feats').select('*').order('name_pt', { ascending: true });
      setFeats(fData || []);
      
      let defaultClassId = null;
      if (ccData && ccData.length > 0) {
        // Find last leveled class, or highest level class
        const lastClass = ccData.sort((a,b) => b.level - a.level)[0];
        defaultClassId = lastClass.class_id;
      } else if (clsData && clsData.length > 0) {
        defaultClassId = clsData[0].id;
      }
      
      if (defaultClassId) {
        await loadFeaturesForClass(defaultClassId, ccData || []);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentClassData = charClasses.find(c => c.class_id === selectedClassId) || { level: 0 };
  const newClassLevel = currentClassData.level + 1;
  const targetClass = classes.find(c => c.id === selectedClassId);

  const canMulticlass = (cls) => {
    if (charClasses.some(c => c.class_id === cls.id)) return true;
    const req = MULTICLASS_REQUIREMENTS[cls.id];
    if (!req) return true;
    return req({
      str: character.attributes.str, dex: character.attributes.dex, con: character.attributes.con,
      int: character.attributes.int, wis: character.attributes.wis, cha: character.attributes.cha
    });
  };

  const loadFeaturesForClass = async (clsId, ccDataArray) => {
    setSelectedClassId(clsId);
    
    // reset hp state for new class
    setHpRoll(null);
    setHpType('average');

    const cc = ccDataArray.find(c => c.class_id === clsId) || { level: 0 };
    const ncLevel = cc.level + 1;

    try {
      // 1. Fetch Class Features
      const { data: fts } = await supabase.from('class_features')
        .select('*')
        .eq('class_id', clsId)
        .eq('level_required', ncLevel);
      
      let allFeatures = fts || [];
      
      // 2. Fetch Subclass Features (if they already have a subclass)
      if (cc.subclass_id) {
        const { data: subFts } = await supabase.from('subclass_features')
          .select('*')
          .eq('subclass_id', cc.subclass_id)
          .eq('level_required', ncLevel);
        if (subFts) allFeatures = [...allFeatures, ...subFts];
      }
      
      setFeatures(allFeatures);

      const unlockRule = allFeatures.find(f => f.rules_json?.type === 'subclass_unlock' || f.rules_json?.type === 'subclass_selection');
      if (unlockRule) {
        setNeedsSubclass(true);
        const { data: subData } = await supabase.from('subclasses').select('*').eq('class_id', clsId);
        setSubclasses(subData || []);
      } else {
        setNeedsSubclass(false);
      }

      const asiRule = allFeatures.find(f => f.rules_json?.type === 'choice' && f.rules_json?.choice_kind === 'asi_or_feat');
      setNeedsAsi(!!asiRule);

      // 3. Fetch Class Choice Rules
      const { data: cr } = await supabase.from('class_choice_rules')
        .select('*')
        .eq('class_id', clsId)
        .eq('level_required', ncLevel);
        
      let allChoiceRules = cr || [];
      
      // 4. Fetch Subclass Choice Rules (if applicable)
      if (cc.subclass_id) {
         const { data: subCr } = await supabase.from('subclass_choice_rules')
          .select('*')
          .eq('subclass_id', cc.subclass_id)
          .eq('level_required', ncLevel);
         if (subCr) allChoiceRules = [...allChoiceRules, ...subCr];
      }
      
      setChoiceRules(allChoiceRules);
      
      if (allChoiceRules.length > 0) {
        const classOptionTypes = allChoiceRules.filter(c => c.class_id).map(c => c.option_type);
        const subOptionTypes = allChoiceRules.filter(c => c.subclass_id).map(c => c.option_type);
        
        let allOptions = [];
        if (classOptionTypes.length > 0) {
           const { data: opts } = await supabase.from('class_options')
            .select('*')
            .eq('class_id', clsId)
            .in('option_type', classOptionTypes);
           if (opts) allOptions = [...allOptions, ...opts];
        }
        
        if (subOptionTypes.length > 0 && cc.subclass_id) {
           const { data: subOpts } = await supabase.from('subclass_options')
            .select('*')
            .eq('subclass_id', cc.subclass_id)
            .in('option_type', subOptionTypes);
           if (subOpts) allOptions = [...allOptions, ...subOpts];
        }
        
        const grouped = {};
        allChoiceRules.forEach(t => grouped[t.option_type] = []);
        allOptions.forEach(o => {
          if (grouped[o.option_type]) grouped[o.option_type].push(o);
        });
        setOptionsData(grouped);
      } else {
        setOptionsData({});
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectClass = async (clsId) => {
    setLoading(true);
    await loadFeaturesForClass(clsId, charClasses);
    setStep(0);
    setLoading(false);
  };

  const handleRollHp = () => {
    if (hpRoll) return;
    const maxDie = CLASS_HIT_DICE[selectedClassId] || 8;
    const roll = Math.floor(Math.random() * maxDie) + 1;
    setHpRoll(roll);
  };

  const getConMod = () => Math.floor((character.attributes.con - 10) / 2);
  const getAverageHp = () => {
    const maxDie = CLASS_HIT_DICE[selectedClassId] || 8;
    return Math.floor(maxDie / 2) + 1;
  };

  const calculateAddedHp = () => {
    if (hpType === 'average') return getAverageHp() + getConMod();
    return (hpRoll || 0) + getConMod();
  };

  const handleFinish = async () => {
    if (hpType === 'roll' && !hpRoll) return alert('Você precisa rolar o dado de HP!');
    if (needsSubclass && !selectedSubclassId) return alert('Selecione uma subclasse.');
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
      if (picks.length !== rule.pick_count) return alert(`Complete a escolha: ${rule.choice_text}`);
    }

    setLoading(true);
    try {
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

      if (needsAsi && asiType === 'feat') {
        await supabase.from('char_feats').insert({
          sheet_id: character.id,
          feat_id: selectedFeatId,
          acquired_at_level: newCharLevel
        });
      }

      for (const rule of choiceRules) {
        const picks = selectedOptions[rule.choice_key] || [];
        for (const pickId of picks) {
          if (rule.class_id) {
            await supabase.from('char_class_choices').insert({
              sheet_id: character.id,
              class_id: selectedClassId,
              level_acquired: newClassLevel,
              choice_key: rule.choice_key,
              option_id: pickId
            });
          } else if (rule.subclass_id) {
             await supabase.from('char_subclass_choices').insert({
              sheet_id: character.id,
              subclass_id: rule.subclass_id,
              option_id: pickId,
              level_chosen: newClassLevel
            });
          }
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

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface-container max-w-2xl w-full rounded-3xl shadow-2xl flex flex-col border border-white/5 overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-surface-container-high">
          <h2 className="text-xl font-bold uppercase font-['Space_Grotesk'] text-sheet-accent flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">upgrade</span>
            Evolução de Nível
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-neutral-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-10 h-10 animate-spin text-sheet-accent" /></div>
          ) : (
            <div className="space-y-6">
              
              {/* MULTICLASS SELECTION STEP */}
              {step === -1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-lg font-bold text-white mb-2">Evoluir Outra Classe</h3>
                  <p className="text-sm text-neutral-400 mb-4">Selecione uma nova classe. Classes que você não possui os atributos mínimos necessários estarão desabilitadas.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {classes.map(cls => {
                      const hasClass = charClasses.some(c => c.class_id === cls.id);
                      const meetsReq = canMulticlass(cls);
                      const isSelected = selectedClassId === cls.id;
                      
                      return (
                        <button
                          key={cls.id}
                          disabled={!meetsReq}
                          onClick={() => handleSelectClass(cls.id)}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-sheet-accent bg-sheet-accent/10' : meetsReq ? 'border-surface-container-highest bg-surface-container-low hover:border-white/20 hover:bg-white/5' : 'border-white/5 bg-black/20 opacity-50 cursor-not-allowed'}`}
                        >
                          <div>
                            <span className={`font-bold block uppercase tracking-widest ${isSelected ? 'text-sheet-accent' : 'text-neutral-200'}`}>{cls.name}</span>
                            {hasClass ? (
                              <span className="text-xs text-neutral-400">Atual Nível {(charClasses.find(c=>c.class_id===cls.id)?.level || 0)}</span>
                            ) : (
                              <span className="text-xs text-cyan-400">Nova Classe</span>
                            )}
                          </div>
                          {!meetsReq && <span className="text-[10px] text-red-400 text-right max-w-[80px]">Requisitos Insuficientes</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-start pt-4">
                    <button onClick={() => setStep(0)} className="px-4 py-2 text-neutral-400 hover:text-white transition-colors">Cancelar</button>
                  </div>
                </div>
              )}

              {/* STEP 0: HP AND OVERVIEW */}
              {step === 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/30 p-4 rounded-xl border border-white/5">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-neutral-400">Classe a ser evoluída</p>
                      <h3 className="text-xl font-bold text-white uppercase">{targetClass?.name} <span className="text-sheet-accent">(Nível {newClassLevel})</span></h3>
                    </div>
                    <button 
                      onClick={() => setStep(-1)}
                      className="px-4 py-2 bg-surface-container border border-white/10 rounded-lg text-xs font-bold text-neutral-300 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Evoluir Outra Classe
                    </button>
                  </div>
                  
                  <div className="bg-surface-container-low p-4 rounded-xl border border-white/5">
                    <h4 className="font-bold text-neutral-200 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-400">favorite</span>
                      Aumento de Pontos de Vida (Dado: d{CLASS_HIT_DICE[selectedClassId] || 8})
                    </h4>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <label className={`flex-1 flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-colors ${hpType === 'average' ? 'border-sheet-accent bg-sheet-accent/10' : 'border-surface-container-highest hover:bg-white/5'}`}>
                        <input type="radio" name="hpType" checked={hpType === 'average'} onChange={() => setHpType('average')} className="hidden" />
                        <span className="font-bold text-white uppercase text-sm mb-1">Média Fixa</span>
                        <span className="text-xs text-neutral-400">Ganha {getAverageHp()} + {getConMod()} (CON) = <b className="text-white text-lg">{getAverageHp() + getConMod()}</b> HP</span>
                      </label>
                      
                      <label className={`flex-1 flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-colors ${hpType === 'roll' ? 'border-sheet-accent bg-sheet-accent/10' : 'border-surface-container-highest hover:bg-white/5'}`}>
                        <input type="radio" name="hpType" checked={hpType === 'roll'} onChange={() => { setHpType('roll'); }} className="hidden" />
                        <span className="font-bold text-white uppercase text-sm mb-1">Rolar o Dado</span>
                        <span className="text-xs text-neutral-400 mt-1">
                          {hpRoll ? (
                            <>Rolado: <b>{hpRoll}</b> + {getConMod()} (CON) = <b className="text-white text-lg">{hpRoll + getConMod()}</b> HP</>
                          ) : (
                            hpType === 'roll' ? (
                              <button onClick={handleRollHp} className="mt-2 w-full py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center gap-2 font-bold uppercase text-[10px]">
                                <Dices className="w-4 h-4" /> Rolar 1d{CLASS_HIT_DICE[selectedClassId] || 8} Agora
                              </button>
                            ) : (
                              'Role o d' + (CLASS_HIT_DICE[selectedClassId] || 8) + ' (Apenas 1 chance!)'
                            )
                          )}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-4 rounded-xl border border-white/5">
                    <h4 className="font-bold text-neutral-200 mb-3 uppercase tracking-widest text-xs opacity-70">Novas Características Recebidas</h4>
                    {features.length === 0 ? (
                      <p className="text-neutral-500 text-sm">Nenhuma característica nova neste nível.</p>
                    ) : (
                      <ul className="space-y-3">
                        {features.map(f => (
                          <li key={f.id} className="border-l-2 border-sheet-accent pl-3">
                            <span className="block font-bold text-sm text-white">{f.name_pt || f.name}</span>
                            <span className="block text-xs text-neutral-400 mt-1">{f.summary}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={() => {
                        if (hpType === 'roll' && !hpRoll) return alert('Você escolheu rolar o dado. Por favor, role o dado antes de continuar!');
                        setStep(1);
                      }}
                      className="px-6 py-3 bg-sheet-accent text-surface-container-highest font-bold rounded-xl flex items-center gap-2 hover:brightness-110"
                    >
                      Avançar <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: CHOICES & SUBCLASS & ASI */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Especializações e Escolhas</h3>
                  
                  {/* SUBCLASS UNLOCK */}
                  {needsSubclass && (
                    <div className="bg-surface-container-low p-4 rounded-xl border border-cyan-500/30">
                      <h4 className="font-bold text-cyan-400 mb-2 uppercase tracking-widest text-xs">Escolha sua Subclasse</h4>
                      <select 
                        value={selectedSubclassId} 
                        onChange={(e) => setSelectedSubclassId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">-- Selecione --</option>
                        {subclasses.map(s => (
                          <option key={s.id} value={s.id}>{s.name_pt || s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* CLASS CHOICES (Fighting Styles, Metamagics, etc) */}
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
                      <div key={rule.id} className="bg-surface-container-low p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-sheet-accent">{rule.choice_text}</h4>
                          <span className="text-xs bg-black/40 px-2 py-1 rounded-lg text-neutral-400">{currentPicks.length} / {rule.pick_count}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 sheet-themed-scroll">
                          {opts.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => togglePick(opt.id)}
                              className={`p-3 text-left rounded-lg text-sm transition-all border ${currentPicks.includes(opt.id) ? 'bg-sheet-accent/20 border-sheet-accent' : 'bg-black/30 border-white/5 hover:bg-white/5'}`}
                            >
                              <span className="block font-bold text-neutral-200">{opt.name_pt || opt.name}</span>
                              <span className="block text-[10px] text-neutral-500 mt-1 leading-tight">{opt.summary}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {/* ASI / FEAT */}
                  {needsAsi && (
                    <div className="bg-surface-container-low p-4 rounded-xl border border-amber-500/30">
                      <h4 className="font-bold text-amber-400 mb-4 uppercase tracking-widest text-xs">Aprimoramento de Atributo</h4>
                      
                      <div className="flex gap-4 mb-4">
                        <label className={`flex-1 text-center p-3 rounded-lg border cursor-pointer ${asiType === 'asi' ? 'bg-amber-500/20 border-amber-400' : 'bg-black/30 border-white/10'}`}>
                          <input type="radio" className="hidden" checked={asiType === 'asi'} onChange={() => setAsiType('asi')} />
                          <span className="font-bold text-sm text-neutral-200">+2 em Atributos</span>
                        </label>
                        <label className={`flex-1 text-center p-3 rounded-lg border cursor-pointer ${asiType === 'feat' ? 'bg-amber-500/20 border-amber-400' : 'bg-black/30 border-white/10'}`}>
                          <input type="radio" className="hidden" checked={asiType === 'feat'} onChange={() => setAsiType('feat')} />
                          <span className="font-bold text-sm text-neutral-200">Escolher Talento</span>
                        </label>
                      </div>

                      {asiType === 'asi' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(st => (
                            <div key={st} className="flex flex-col bg-black/40 p-2 rounded-lg items-center">
                              <span className="uppercase text-[10px] font-bold text-neutral-400 mb-1">{st} ({character.attributes[st] + asiStats[st]})</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setAsiStats({...asiStats, [st]: Math.max(0, asiStats[st]-1)})} className="text-neutral-400 hover:text-white w-6 h-6 flex items-center justify-center bg-white/5 rounded">-</button>
                                <span className="text-white font-bold w-4 text-center">{asiStats[st]}</span>
                                <button onClick={() => setAsiStats({...asiStats, [st]: asiStats[st]+1})} className="text-neutral-400 hover:text-white w-6 h-6 flex items-center justify-center bg-white/5 rounded">+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {asiType === 'feat' && (
                        <select 
                          value={selectedFeatId} 
                          onChange={(e) => setSelectedFeatId(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="">-- Selecione o Talento --</option>
                          {feats.map(f => (
                            <option key={f.id} value={f.id}>{f.name_pt || f.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {!needsSubclass && choiceRules.length === 0 && !needsAsi && (
                    <div className="p-6 text-center border border-dashed border-white/10 rounded-xl">
                      <span className="material-symbols-outlined text-4xl text-neutral-600 mb-2 block">task_alt</span>
                      <p className="text-neutral-400 text-sm">Não há escolhas adicionais necessárias para este nível. Você está pronto!</p>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <button onClick={() => setStep(0)} className="px-4 py-2 text-neutral-400 hover:text-white transition-colors">Voltar</button>
                    <button 
                      onClick={handleFinish}
                      className="px-6 py-3 bg-sheet-accent text-surface-container-highest font-bold rounded-xl flex items-center gap-2 hover:brightness-110"
                    >
                      Finalizar Evolução <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
