import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  supabase, 
  getClassesList, 
  getRacesList, 
  getBackgroundsList, 
  createCharacterRequest,
  getSubRacesList,
  getSkillsList,
  getClassProficiencies,
  getBackgroundProficiencies,
  getRaceProficiencies,
  getSubclassesList
} from '../lib/supabaseClient';
import { Loader2, Dices, Save, ChevronLeft } from 'lucide-react';
import Combobox from '../components/Combobox';

// Mapeamento de atributos para PT-BR
const ATTR_MAP = {
  for: 'Força', des: 'Destreza', con: 'Constituição', 
  int: 'Inteligência', sab: 'Sabedoria', car: 'Carisma'
};

export default function CharacterCreationRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  // DB Options
  const [dbData, setDbData] = useState({ 
    classes: [], races: [], backgrounds: [], skills: [] 
  });
  
  // Dynamic Options
  const [subRaces, setSubRaces] = useState([]);
  const [subclasses, setSubclasses] = useState([]);
  const [classProficiencies, setClassProficiencies] = useState([]);
  const [bgProficiencies, setBgProficiencies] = useState([]);
  const [raceProficiencies, setRaceProficiencies] = useState([]);
  const [raceWildcards, setRaceWildcards] = useState(0);
  const [activeBonuses, setActiveBonuses] = useState({}); // { for: 2, des: 1, any: 0 }
  const [wildcardBonuses, setWildcardBonuses] = useState({ for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    race: '',       // holds ID
    sub_race: '',   // holds ID
    class: '',      // holds ID
    subclass: '',   // holds ID (only for level-1 subclass classes)
    background: '', // holds ID
    attributes: { for: null, des: null, con: null, int: null, sab: null, car: null },
    skills: [],     // holds skill IDs
    notes: '',
  });

  // Roll Mechanics
  const [rollHistory, setRollHistory] = useState([]); // keeps arrays of 6 values: [ [15,14,13...], ... ]
  const [activeRollIndex, setActiveRollIndex] = useState(-1);
  const [rolls, setRolls] = useState([]); // [{ id: 0, val: 14, used: false }]
  const [selectedRollId, setSelectedRollId] = useState(null);
  
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);

      const [cRes, rRes, bRes, sRes] = await Promise.all([
        getClassesList(),
        getRacesList(),
        getBackgroundsList(),
        getSkillsList()
      ]);

      setDbData({
        classes: cRes.data || [],
        races: rRes.data || [],
        backgrounds: bRes.data || [],
        skills: sRes.data || []
      });

      setLoading(false);
    };
    init();
  }, [navigate]);

  // Handle Race/SubRace Change
  useEffect(() => {
    const fetchRaceData = async () => {
      // Fetch subraces
      if (formData.race) {
        const srRes = await getSubRacesList(formData.race);
        setSubRaces(srRes.data);
        
        // Attr bonuses calculation
        const raceObj = dbData.races.find(r => r.id == formData.race);
        const subObj = srRes.data.find(s => s.id == formData.sub_race);
        
        let bonuses = { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0, any: 0 };
        const applyBonus = (b) => {
          if (!b) return;
          if (b.for) bonuses.for += b.for;
          if (b.des) bonuses.des += b.des;
          if (b.con) bonuses.con += b.con;
          if (b.int) bonuses.int += b.int;
          if (b.sab) bonuses.sab += b.sab;
          if (b.car) bonuses.car += b.car;
          if (b.any) bonuses.any += b.any;
        };
        
        if (raceObj?.attr_bonuses) applyBonus(raceObj.attr_bonuses);
        if (subObj?.attr_bonuses) applyBonus(subObj.attr_bonuses);
        setActiveBonuses(bonuses);
        
        // Proficiencies
        const pRes = await getRaceProficiencies(formData.race, formData.sub_race);
        const autoProfs = [];
        let wildcards = 0;
        pRes.data.forEach(p => {
          if (p.is_wildcard) wildcards++;
          else autoProfs.push(p.skill_id);
        });
        setRaceProficiencies(autoProfs);
        setRaceWildcards(wildcards);

        // Force add into selected
        setFormData(prev => {
           const newSkills = new Set(prev.skills);
           autoProfs.forEach(id => newSkills.add(id));
           return { ...prev, skills: Array.from(newSkills) };
        });

      } else {
        setSubRaces([]);
        setRaceProficiencies([]);
        setRaceWildcards(0);
        setActiveBonuses({});
      }
      setWildcardBonuses({ for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 });
    };
    fetchRaceData();
  }, [formData.race, formData.sub_race, dbData.races]);

  // Handle Class Change to fetch class prof highlights and subclasses
  useEffect(() => {
    if (formData.class) {
      getClassProficiencies(formData.class).then(res => {
        setClassProficiencies(res.data);
      });
      // Check if class picks subclass at level 1
      const classObj = dbData.classes.find(c => c.id == formData.class);
      if (classObj?.subclass_level === 1) {
        getSubclassesList(formData.class).then(res => setSubclasses(res.data));
      } else {
        setSubclasses([]);
        setFormData(prev => ({ ...prev, subclass: '' }));
      }
    } else {
      setClassProficiencies([]);
      setSubclasses([]);
      setFormData(prev => ({ ...prev, subclass: '' }));
    }
  }, [formData.class, dbData.classes]);

  // Handle Background Change to fetch auto profs
  useEffect(() => {
    if (formData.background) {
      getBackgroundProficiencies(formData.background).then(res => {
        setBgProficiencies(res.data);
      });
    } else {
      setBgProficiencies([]);
    }
  }, [formData.background]);

  // Calculate usage logic shared across validation and UI
  const calculateSkillUsage = (skillsList, classObjLimit, limitWildcard) => {
    const manualSkills = skillsList.filter(id => !bgProficiencies.includes(id) && !raceProficiencies.includes(id));
    let usedClassSlots = 0;
    let usedWildSlots = 0;
    const allowedManualSkills = [];
    
    manualSkills.forEach(id => {
      if (classProficiencies.includes(id) && usedClassSlots < classObjLimit) {
        usedClassSlots++;
        allowedManualSkills.push(id);
      } else if (usedWildSlots < limitWildcard) {
        usedWildSlots++;
        allowedManualSkills.push(id);
      }
    });
    
    return { usedClassSlots, usedWildSlots, allowedManualSkills };
  };

  // Trim or expand skills when dependencies boundaries change
  useEffect(() => {
    setFormData(prev => {
      const classObj = dbData.classes.find(c => c.id == prev.class);
      const limitClass = classObj?.skill_choices_count || 2;
      const limitWildcard = raceWildcards;
      
      const { allowedManualSkills } = calculateSkillUsage(prev.skills, limitClass, limitWildcard);
      
      const newSkillsSet = new Set([...bgProficiencies, ...raceProficiencies, ...allowedManualSkills]);
      const newSkillsArray = Array.from(newSkillsSet);
      
      if (newSkillsArray.length !== prev.skills.length || !newSkillsArray.every(val => prev.skills.includes(val))) {
        return { ...prev, skills: newSkillsArray };
      }
      return prev;
    });
  }, [raceProficiencies, classProficiencies, bgProficiencies, raceWildcards, dbData.classes]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCombobox = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const roll4d6kh3 = () => {
    let rs = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
    rs.sort((a, b) => b - a); // descending
    return rs[0] + rs[1] + rs[2];
  };

  const loadRollsState = (index, history) => {
    const rawValues = history[index];
    const newRolls = rawValues.map((val, i) => ({
      id: i,
      val: val,
      used_in: null
    }));
    setRolls(newRolls);
    setActiveRollIndex(index);
    setSelectedRollId(null);
    setFormData(prev => ({
      ...prev,
      attributes: { for: null, des: null, con: null, int: null, sab: null, car: null }
    }));
  };

  const rollAllAttributes = () => {
    if (rollHistory.length >= 3) {
      alert("Você já usou todas as suas 3 chances de rolagem!");
      return;
    }
    const rawVals = Array(6).fill(0).map(() => roll4d6kh3()).sort((a, b) => b - a);
    const newHistory = [...rollHistory, rawVals];
    setRollHistory(newHistory);
    loadRollsState(newHistory.length - 1, newHistory);
  };

  const handleRollClick = (roll) => {
    if (roll.used_in) {
      // Unassign
      setFormData(prev => ({
        ...prev,
        attributes: { ...prev.attributes, [roll.used_in]: null }
      }));
      setRolls(prev => prev.map(r => r.id === roll.id ? { ...r, used_in: null } : r));
      setSelectedRollId(null);
    } else {
      // Select for assignment
      setSelectedRollId(roll.id === selectedRollId ? null : roll.id);
    }
  };

  const handleAttributeBoxClick = (attrKey) => {
    // If there is a selected roll to assign
    if (selectedRollId !== null) {
      const selectedRoll = rolls.find(r => r.id === selectedRollId);
      
      // Se a caixa já tem um roll, desatribui
      const prevUsedRoll = rolls.find(r => r.used_in === attrKey);
      
      let newRolls = [...rolls];
      if (prevUsedRoll) {
        newRolls = newRolls.map(r => r.id === prevUsedRoll.id ? { ...r, used_in: null } : r);
      }
      
      newRolls = newRolls.map(r => r.id === selectedRollId ? { ...r, used_in: attrKey } : r);
      setRolls(newRolls);
      
      setFormData(prev => ({
        ...prev,
        attributes: { ...prev.attributes, [attrKey]: selectedRoll.val }
      }));
      setSelectedRollId(null);
    }
  };

  const toggleSkill = (skillId) => {
    // Cannot toggle auto proficiencies
    if (bgProficiencies.includes(skillId) || raceProficiencies.includes(skillId)) return;

    setFormData(prev => {
      const exists = prev.skills.includes(skillId);
      if (exists) {
        return { ...prev, skills: prev.skills.filter(id => id !== skillId) };
      } else {
        // Validation for limits
        const classObj = dbData.classes.find(c => c.id == formData.class);
        const limitClass = classObj?.skill_choices_count || 2;
        const limitWildcard = raceWildcards;
        
        // We simulate what adding this skill does to the count
        const testSkills = [...prev.skills, skillId];
        const { allowedManualSkills } = calculateSkillUsage(testSkills, limitClass, limitWildcard);
        
        // Se após calcular, a skill nova não está na lista permitida, barramos!
        if (!allowedManualSkills.includes(skillId)) {
           const isClass = classProficiencies.includes(skillId);
           if (isClass) {
              alert(`Você já atingiu o limite de escolhas da classe (${limitClass}) e coringas (${limitWildcard}).`);
           } else {
              alert(`Esta perícia não é da sua classe. Você atingiu o limite de coringas disponíveis (${limitWildcard}).`);
           }
           return prev;
        }

        return { ...prev, skills: [...prev.skills, skillId] };
      }
    });
  };

  // Convert IDs to Labels for Submission Data
  const getLabel = (list, id, key="name") => {
    const item = list.find(i => i.id == id);
    return item ? (item.name_pt || item[key]) : '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Preencha o nome do personagem.");
    
    // Validate attributes completion
    const attrs = formData.attributes;
    if (Object.values(attrs).some(v => v === null)) {
      return alert("Você deve distribuir todos os atributos ou preenchê-los.");
    }

    setSubmitting(true);

    const skillsNames = formData.skills.map(id => getLabel(dbData.skills, id)).join(', ');

    const finalData = {
      name: formData.name,
      race: getLabel(dbData.races, formData.race) || formData.race,
      sub_race: getLabel(subRaces, formData.sub_race) || formData.sub_race,
      class: getLabel(dbData.classes, formData.class) || formData.class,
      subclass: formData.subclass ? (subclasses.find(s => s.id == formData.subclass)?.name_pt || formData.subclass) : undefined,
      background: getLabel(dbData.backgrounds, formData.background) || formData.background,
      
      race_id: formData.race ? Number(formData.race) : null,
      sub_race_id: formData.sub_race ? Number(formData.sub_race) : null,
      class_id: formData.class ? Number(formData.class) : null,
      subclass_id: formData.subclass ? Number(formData.subclass) : null,
      background_id: formData.background ? Number(formData.background) : null,

      attributes: {
        str: (attrs.for || 0) + (activeBonuses.for || 0) + (wildcardBonuses.for || 0),
        dex: (attrs.des || 0) + (activeBonuses.des || 0) + (wildcardBonuses.des || 0),
        con: (attrs.con || 0) + (activeBonuses.con || 0) + (wildcardBonuses.con || 0),
        int: (attrs.int || 0) + (activeBonuses.int || 0) + (wildcardBonuses.int || 0),
        wis: (attrs.sab || 0) + (activeBonuses.sab || 0) + (wildcardBonuses.sab || 0),
        cha: (attrs.car || 0) + (activeBonuses.car || 0) + (wildcardBonuses.car || 0),
      },
      skills: skillsNames,
      skill_ids: formData.skills,
      notes: formData.notes,
      roll_count: rollHistory.length,
      rolled_stats: rollHistory[activeRollIndex] || []
    };

    const { error } = await createCharacterRequest(user.id, finalData);
    
    setSubmitting(false);

    if (error) {
      alert("Erro ao enviar: " + error);
    } else {
      navigate('/selecao'); 
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-purple-500">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-4 sm:p-8 relative overflow-x-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        
        <header className="mb-8">
          <button 
            onClick={() => navigate('/selecao')}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-4 text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Criar Personagem (Nível 1)</h1>
          <p className="text-neutral-400 mt-2">
            Preencha sua ficha, role seus atributos e envie para os deuses (o Mestre) avaliarem.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 bg-neutral-900/40 p-6 sm:p-8 rounded-2xl border border-neutral-800">
          
          {/* Identidade */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 border-b border-neutral-800 pb-2">Identidade e Origem</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Nome do Aventureiro *</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange} required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Ex: Shan Wu, Lorrander, Ryunk..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Classe</label>
                <Combobox 
                  options={dbData.classes}
                  value={formData.class}
                  onChange={(val) => handleCombobox('class', val)}
                />
              </div>

              {subclasses.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-amber-400 mb-1.5">Arquétipo</label>
                  <Combobox 
                    options={subclasses}
                    value={formData.subclass}
                    onChange={(val) => handleCombobox('subclass', val)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Raça</label>
                <Combobox 
                  options={dbData.races}
                  value={formData.race}
                  onChange={(val) => handleCombobox('race', val)}
                />
              </div>

              {subRaces.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-purple-400 mb-1.5">Sub-raça</label>
                  <Combobox 
                    options={subRaces}
                    value={formData.sub_race}
                    onChange={(val) => handleCombobox('sub_race', val)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Antecedente</label>
                <Combobox 
                  options={dbData.backgrounds}
                  value={formData.background}
                  onChange={(val) => handleCombobox('background', val)}
                />
              </div>

            </div>
          </section>

          {/* Atributos */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-neutral-800 pb-2 gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Atributos (4d6kh3)</h2>
                <div className="text-xs mt-1 text-neutral-400">
                  Tentativas usadas: <span className={rollHistory.length === 3 ? "text-red-400 font-bold" : "text-purple-400 font-bold"}>{rollHistory.length}/3</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={rollAllAttributes}
                disabled={rollHistory.length >= 3}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 border border-purple-500 text-white hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center disabled:opacity-50 disabled:grayscale"
              >
                <Dices className="w-4 h-4" /> Role Atributos
              </button>
            </div>

            {rollHistory.length > 0 && (
              <div className="mb-4 flex gap-2">
                {rollHistory.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={rollHistory.length === 3 && i !== 2}
                    onClick={() => {
                        if (window.confirm("Trocar de rolagem vai resetar os atributos já distribuídos. Continuar?")) {
                            loadRollsState(i, rollHistory);
                        }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      activeRollIndex === i 
                        ? 'bg-purple-600 text-white' 
                        : rollHistory.length === 3 && i !== 2 
                        ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed hidden line-through'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    Rolagem {i + 1} {rollHistory.length === 3 && i === 2 ? '(Definitiva)' : ''}
                  </button>
                ))}
              </div>
            )}

            {rolls.length > 0 && (
              <div className="mb-8 p-6 bg-neutral-950 rounded-xl border border-neutral-800">
                <span className="text-sm text-neutral-400 block mb-3 text-center">Blocos Rolados (Clique para selecionar, depois clique no atributo):</span>
                <div className="flex justify-center gap-3 flex-wrap">
                  {rolls.map((r) => {
                    const isSelected = selectedRollId === r.id;
                    const isUsed = !!r.used_in;
                    return (
                      <button 
                        key={r.id} type="button"
                        onClick={() => handleRollClick(r)}
                        className={`text-2xl font-black w-14 h-14 flex items-center justify-center rounded-xl border transition-all ${
                          isUsed ? 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-pointer hover:border-red-500/50' 
                          : isSelected ? 'bg-purple-600 border-purple-400 text-white scale-110 shadow-lg shadow-purple-600/50' 
                          : 'bg-purple-900/30 border-purple-800 text-purple-300 hover:bg-purple-800/50 hover:border-purple-600 cursor-pointer'
                        }`}
                        title={isUsed ? `Atribuído a ${ATTR_MAP[r.used_in]}. Clique para remover.` : 'Clique para usar'}
                      >
                        {r.val}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mt-6">
              {['for', 'des', 'con', 'int', 'sab', 'car'].map((attr) => {
                const isTarget = selectedRollId !== null;
                const value = formData.attributes[attr] || 0;
                const usedWildcards = Object.values(wildcardBonuses).reduce((a,b)=>a+b, 0);
                const availableWildcards = (activeBonuses.any || 0) - usedWildcards;
                const fixedBonus = activeBonuses[attr] || 0;
                const wildBonus = wildcardBonuses[attr] || 0;
                const total = (value || 0) + fixedBonus + wildBonus;
                const modifier = value ? Math.floor((total - 10) / 2) : null;
                // Cannot apply wildcard to an attribute that already has a fixed racial bonus
                const hasFixed = fixedBonus > 0;
                const canAddWild = !hasFixed && availableWildcards > 0 && wildBonus < 1;
                const canRemoveWild = wildBonus > 0;
                const showWildcardControls = activeBonuses.any > 0;

                return (
                  <div key={attr} className="flex flex-col items-center gap-1">
                    {/* Modifier Badge */}
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ 
                      modifier === null ? 'bg-neutral-900 border-neutral-800 text-neutral-600'
                      : modifier >= 0 ? 'bg-emerald-900/40 border-emerald-700 text-emerald-400'
                      : 'bg-red-900/40 border-red-700 text-red-400'
                    }`}>
                      {modifier !== null ? (modifier >= 0 ? `+${modifier}` : `${modifier}`) : '—'}
                    </div>

                    {/* Main Attr Box + Side Buttons */}
                    <div className="flex items-center gap-1 w-full">
                      {/* Minus Button */}
                      {showWildcardControls ? (
                        <button
                          type="button"
                          disabled={!canRemoveWild}
                          onClick={() => setWildcardBonuses(prev => ({...prev, [attr]: prev[attr] - 1}))}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg border text-xs font-black transition-all disabled:opacity-20 disabled:cursor-not-allowed bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-red-900/40 hover:border-red-700 hover:text-red-400 disabled:hover:bg-neutral-900 disabled:hover:border-neutral-700 disabled:hover:text-neutral-400"
                        >−</button>
                      ) : <div className="w-0" />}

                      {/* Attr Card */}
                      <div 
                        onClick={() => handleAttributeBoxClick(attr)}
                        className={`flex-1 p-3 rounded-xl border text-center transition-all relative cursor-pointer ${
                          isTarget && !value ? 'bg-purple-900/10 border-purple-500/50 hover:bg-purple-900/30 ring-2 ring-purple-500/50 ring-offset-1 ring-offset-neutral-950 animate-pulse' 
                          : value ? 'bg-emerald-900/10 border-emerald-800/50 hover:bg-red-900/10 hover:border-red-800'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 pointer-events-none">{attr}</label>
                        <input 
                          type="number" min="1" max="30" 
                          value={value || ''} 
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              attributes: { ...prev.attributes, [attr]: Number(e.target.value) }
                            }));
                          }}
                          className="w-full bg-transparent text-center text-2xl font-black text-white focus:outline-none placeholder-neutral-800"
                          placeholder="—"
                        />
                        {/* Fixed Race Bonus badge */}
                        {fixedBonus > 0 && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow whitespace-nowrap">+{fixedBonus} Raça</div>
                        )}
                        {/* Wildcard Bonus badge */}
                        {wildBonus > 0 && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow whitespace-nowrap">+{wildBonus} Livre</div>
                        )}
                      </div>

                      {/* Plus Button */}
                      {showWildcardControls ? (
                        <button
                          type="button"
                          disabled={!canAddWild}
                          onClick={() => setWildcardBonuses(prev => ({...prev, [attr]: prev[attr] + 1}))}
                          title={hasFixed ? 'Não é possível acumular com bônus fixo da raça' : wildBonus >= 1 ? 'Máximo de 1 ponto livre por atributo' : 'Adicionar ponto livre'}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg border text-xs font-black transition-all disabled:opacity-20 disabled:cursor-not-allowed bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-purple-900/40 hover:border-purple-700 hover:text-purple-400 disabled:hover:bg-neutral-900 disabled:hover:border-neutral-700 disabled:hover:text-neutral-400"
                        >+</button>
                      ) : <div className="w-0" />}
                    </div>
                  </div>
                )
              })}
            </div>
            {rolls.length > 0 && selectedRollId === null && rolls.some(r => r.used_in) && (
              <p className="text-center text-xs mt-3 text-neutral-500">Clique na caixa do atributo concluído para editar manualmente ou no bloco cinza acima para remover a ligação.</p>
            )}
            
            {activeBonuses.any > 0 && (
              <div className="mt-4 text-center">
                 <p className="text-sm font-medium text-purple-400">
                    Sua raça concede <strong>{activeBonuses.any}</strong> pontos flexíveis. 
                    Usados: {Object.values(wildcardBonuses).reduce((a,b)=>a+b, 0)}/{activeBonuses.any}.
                 </p>
                 <p className="text-xs text-neutral-500 mt-1">Use os botões (+) e (−) nas laterais. Atributos com bônus fixo da raça não acumulam pontos livres.</p>
              </div>
            )}
          </section>

          {/* Perícias & Extras */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 border-b border-neutral-800 pb-2">Perícias & Detalhes</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-3">
                  Selecione suas Perícias 
                  {(() => {
                     const classObj = dbData.classes.find(c => c.id == formData.class);
                     const limitClass = classObj?.skill_choices_count || 2;
                     
                     const { usedClassSlots, usedWildSlots } = calculateSkillUsage(formData.skills, limitClass, raceWildcards);
                     
                     let txt = ` (Classe: ${usedClassSlots}/${limitClass})`;
                     if (raceWildcards > 0) txt += ` (Curingas: ${usedWildSlots}/${raceWildcards})`;
                     return <span className="ml-2 text-emerald-400 font-bold">{txt}</span>;
                  })()}
                </label>
                
                <div className="flex flex-wrap gap-2">
                  {dbData.skills.map(skill => {
                    const isBg = bgProficiencies.includes(skill.id);
                    const isRace = raceProficiencies.includes(skill.id);
                    const isClass = classProficiencies.includes(skill.id);
                    const isSelected = formData.skills.includes(skill.id);

                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isBg ? 'bg-blue-900/30 border-blue-700 text-blue-300 opacity-80 cursor-not-allowed' 
                          : isRace ? 'bg-purple-900/40 border-purple-600 text-purple-300 opacity-80 cursor-not-allowed'
                          : isSelected ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50'
                          : isClass ? 'bg-emerald-900/20 border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/40'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                        }`}
                        title={isBg ? 'Garantida pelo Antecedente' : isRace ? 'Garantida pela Raça' : isClass ? 'Recomendada pela Classe' : 'Não Listada pela Classe'}
                      >
                        {skill.name_pt || skill.name} {isBg && ' (Origem)'} {isRace && ' (Raça)'}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-neutral-500 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-900/30 border border-blue-700 rounded-full"></span> Antecedente</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-900/40 border border-purple-600 rounded-full"></span> Raça</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-900/20 border border-emerald-600/50 rounded-full"></span> Opções de Classe</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-600 border border-emerald-500 rounded-full"></span> Selecionada</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Notas Adicionais (Magias, Idiomas, Sub-classes extras...)</label>
                <textarea 
                  name="notes" value={formData.notes} onChange={handleChange} rows={4}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                  placeholder="Ex: Peguei proficiência extra no lugar de ferramenta. Vou ser Lâmina Maldita..."
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button
              type="submit" disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Enviar para o Mestre
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
