import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  supabase,
  getClassesList,
  getRacesList,
  getBackgroundsList,
  getSubRacesList,
  getSubclassesList,
  getSavingsSkillsList,
  getSensesLanguagesList,
  getDamageTypesList,
  getFullCreationRequest,
  submitFullCreationRequest,
} from '../lib/supabaseClient';
import { Loader2, Save, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import Combobox from '../components/Combobox';

const ALIGNMENTS = [
  { id: 'LG', name_pt: 'Leal e Bom' },
  { id: 'NG', name_pt: 'Neutro e Bom' },
  { id: 'CG', name_pt: 'Caótico e Bom' },
  { id: 'LN', name_pt: 'Leal e Neutro' },
  { id: 'TN', name_pt: 'Neutro' },
  { id: 'CN', name_pt: 'Caótico e Neutro' },
  { id: 'LE', name_pt: 'Leal e Mau' },
  { id: 'NE', name_pt: 'Neutro e Mau' },
  { id: 'CE', name_pt: 'Caótico e Mau' },
];

const SIZES = [
  { id: 'Tiny', name_pt: 'Miúdo' },
  { id: 'Small', name_pt: 'Pequeno' },
  { id: 'Medium', name_pt: 'Médio' },
  { id: 'Large', name_pt: 'Grande' },
  { id: 'Huge', name_pt: 'Enorme' },
  { id: 'Gargantuan', name_pt: 'Colossal' },
];

const ATTR_LABELS = {
  str: { label: 'FOR', name: 'Força' },
  dex: { label: 'DES', name: 'Destreza' },
  con: { label: 'CON', name: 'Constituição' },
  int: { label: 'INT', name: 'Inteligência' },
  wis: { label: 'SAB', name: 'Sabedoria' },
  cha: { label: 'CAR', name: 'Carisma' },
};

export default function CharacterFullCreation() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState(null);

  // DB reference data
  const [dbData, setDbData] = useState({
    classes: [], races: [], backgrounds: [], allSkills: [],
    sensesLanguages: [], damageTypes: [],
  });
  const [subRaces, setSubRaces] = useState([]);
  const [subclasses, setSubclasses] = useState([]);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    identity: true, combat: true, attributes: true,
    proficiencies: true, sensesLangs: false, defenses: false, notes: true,
  });

  // Form state
  const [form, setForm] = useState({
    name: '',
    race_id: '',
    sub_race_id: '',
    class_id: '',
    subclass_id: '',
    background_id: '',
    alignment: '',
    size: '',
    level: 1,
    exp: 0,
    hit_points: 10,
    hit_points_max: 10,
    armor_class: 10,
    speed: 9,
    speed_fly: '',
    speed_swim: '',
    passive_perception: 10,
    proficiency_bonus: 2,
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    notes: '',
  });

  // Selected proficiencies: { [skill_id]: { proficient: bool, expertise: bool } }
  const [proficiencies, setProficiencies] = useState({});
  // Selected senses/languages IDs
  const [selectedSensesLangs, setSelectedSensesLangs] = useState([]);
  // Resistances, Immunities, Vulnerabilities
  const [resistances, setResistances] = useState([]);
  const [immunities, setImmunities] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      // Load request
      const { data: reqData } = await getFullCreationRequest(requestId);
      if (!reqData || reqData.target_user_id !== session.user.id) {
        navigate('/selecao');
        return;
      }
      setRequest(reqData);

      // Load all reference data in parallel
      const [cRes, rRes, bRes, sRes, slRes, dtRes] = await Promise.all([
        getClassesList(), getRacesList(), getBackgroundsList(),
        getSavingsSkillsList(), getSensesLanguagesList(), getDamageTypesList(),
      ]);

      setDbData({
        classes: cRes.data || [],
        races: rRes.data || [],
        backgrounds: bRes.data || [],
        allSkills: sRes.data || [],
        sensesLanguages: slRes.data || [],
        damageTypes: dtRes.data || [],
      });

      // If there's already saved character_data (user came back), restore
      if (reqData.character_data && Object.keys(reqData.character_data).length > 0) {
        const d = reqData.character_data;
        setForm(prev => ({
          ...prev,
          name: d.name || '', race_id: d.race_id || '', sub_race_id: d.sub_race_id || '',
          class_id: d.class_id || '', subclass_id: d.subclass_id || '',
          background_id: d.background_id || '', alignment: d.alignment || 'TN',
          size: d.size || 'Medium', level: d.level || 1, exp: d.exp || 0,
          hit_points: d.hit_points || 10, hit_points_max: d.hit_points_max || 10,
          armor_class: d.armor_class || 10, speed: d.speed || 9,
          speed_fly: d.speed_fly || '', speed_swim: d.speed_swim || '',
          passive_perception: d.passive_perception || 10,
          proficiency_bonus: d.proficiency_bonus || 2,
          str: d.str || 10, dex: d.dex || 10, con: d.con || 10,
          int: d.int || 10, wis: d.wis || 10, cha: d.cha || 10,
          notes: d.notes || '',
        }));
        if (d.proficiencies) {
          const profMap = {};
          d.proficiencies.forEach(p => {
            profMap[p.skill_id] = { proficient: true, expertise: p.expertise || false };
          });
          setProficiencies(profMap);
        }
        if (d.senses_languages) setSelectedSensesLangs(d.senses_languages);
        if (d.resistances) setResistances(d.resistances);
        if (d.immunities) setImmunities(d.immunities);
        if (d.vulnerabilities) setVulnerabilities(d.vulnerabilities);
      }

      setLoading(false);
    };
    init();
  }, [navigate, requestId]);

  // Handle Race change for sub-races
  useEffect(() => {
    if (form.race_id) {
      getSubRacesList(form.race_id).then(res => setSubRaces(res.data));
    } else {
      setSubRaces([]);
      setForm(prev => ({ ...prev, sub_race_id: '' }));
    }
  }, [form.race_id]);

  // Handle Class change for subclasses
  useEffect(() => {
    if (form.class_id) {
      getSubclassesList(form.class_id).then(res => setSubclasses(res.data));
    } else {
      setSubclasses([]);
      setForm(prev => ({ ...prev, subclass_id: '' }));
    }
  }, [form.class_id]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleProficiency = (skillId) => {
    setProficiencies(prev => {
      const current = prev[skillId];
      if (!current) return { ...prev, [skillId]: { proficient: true, expertise: false } };
      if (current.proficient && !current.expertise) return { ...prev, [skillId]: { proficient: true, expertise: true } };
      const { [skillId]: _, ...rest } = prev;
      return rest;
    });
  };

  const addToList = (setArr, id) => {
    if (!id) return;
    setArr(prev => [...prev, Number(id)]);
  };

  const removeFromList = (setArr, index) => {
    setArr(prev => prev.filter((_, i) => i !== index));
  };

  const getMod = (score) => {
    const mod = Math.floor(((score || 10) - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const buildCharacterData = () => {
    const profArray = Object.entries(proficiencies)
      .filter(([, v]) => v.proficient)
      .map(([skillId, v]) => ({
        skill_id: Number(skillId),
        expertise: v.expertise,
      }));

    return {
      ...form,
      race_id: form.race_id ? Number(form.race_id) : null,
      sub_race_id: form.sub_race_id ? Number(form.sub_race_id) : null,
      class_id: form.class_id ? Number(form.class_id) : null,
      subclass_id: form.subclass_id ? Number(form.subclass_id) : null,
      background_id: form.background_id ? Number(form.background_id) : null,
      level: Number(form.level) || 1,
      exp: Number(form.exp) || 0,
      hit_points: Number(form.hit_points) || 10,
      hit_points_max: Number(form.hit_points_max) || 10,
      armor_class: Number(form.armor_class) || 10,
      speed: Number(form.speed) || 9,
      speed_fly: form.speed_fly ? Number(form.speed_fly) : null,
      speed_swim: form.speed_swim ? Number(form.speed_swim) : null,
      passive_perception: Number(form.passive_perception) || 10,
      proficiency_bonus: Number(form.proficiency_bonus) || 2,
      str: Number(form.str) || 10,
      dex: Number(form.dex) || 10,
      con: Number(form.con) || 10,
      int: Number(form.int) || 10,
      wis: Number(form.wis) || 10,
      cha: Number(form.cha) || 10,
      proficiencies: profArray,
      senses_languages: selectedSensesLangs,
      resistances,
      immunities,
      vulnerabilities,
      // Store display labels for DM review
      _labels: {
        race: dbData.races.find(r => r.id == form.race_id)?.name_pt || '',
        sub_race: subRaces.find(r => r.id == form.sub_race_id)?.name_pt || '',
        class: dbData.classes.find(c => c.id == form.class_id)?.name_pt || '',
        subclass: subclasses.find(s => s.id == form.subclass_id)?.name_pt || '',
        background: dbData.backgrounds.find(b => b.id == form.background_id)?.name_pt || '',
      },
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert('Preencha o nome do personagem.');
    setSubmitting(true);
    const charData = buildCharacterData();
    const { error } = await submitFullCreationRequest(requestId, charData);
    setSubmitting(false);
    if (error) {
      alert('Erro ao enviar: ' + error);
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

  const skills = dbData.allSkills.filter(s => s.type === 'skill');
  const savingThrows = dbData.allSkills.filter(s => s.type === 'saving throw');
  const languages = dbData.sensesLanguages.filter(s => s.type === 'language');
  const senses = dbData.sensesLanguages.filter(s => s.type === 'senses');

  // Section header component
  const SectionHeader = ({ sectionKey, title, icon, color = 'text-purple-400' }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between p-4 bg-neutral-900 hover:bg-neutral-800/80 rounded-xl border border-neutral-800 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-xl ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      </div>
      {openSections[sectionKey]
        ? <ChevronUp className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
        : <ChevronDown className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
      }
    </button>
  );

  // Input helpers
  const InputField = ({ label, name, type = 'text', value, placeholder, className = '' }) => (
    <div className={className}>
      <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type={type} name={name}
        value={value}
        onChange={(e) => handleChange(name, type === 'number' ? e.target.value : e.target.value)}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-neutral-600"
        placeholder={placeholder}
      />
    </div>
  );

  // Toggle pill for multi-selects
  const TogglePill = ({ item, isSelected, onClick, colorScheme = 'purple' }) => {
    const colors = {
      purple: isSelected ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600',
      emerald: isSelected ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600',
      red: isSelected ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600',
      blue: isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600',
      amber: isSelected ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/40' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600',
    };
    return (
      <button type="button" onClick={onClick}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${colors[colorScheme]}`}>
        {item.name_pt || item.name}
      </button>
    );
  };

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
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Registro Completo de Personagem</h1>
          <p className="text-neutral-400 mt-2">
            Preencha todos os dados do seu personagem. Ao finalizar, envie para o Mestre revisar e aprovar.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ─── SEÇÃO 1: IDENTIDADE ─── */}
          <SectionHeader sectionKey="identity" title="Identidade & Origem" icon="badge" />
          {openSections.identity && (
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Nome do Aventureiro *" name="name" value={form.name} placeholder="Ex: Shan Wu, Lorrander..." />

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Classe</label>
                  <Combobox options={dbData.classes} value={form.class_id} onChange={(val) => handleChange('class_id', val)} />
                </div>

                {subclasses.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold text-amber-400 mb-1.5 uppercase tracking-wider">Subclasse / Arquétipo</label>
                    <Combobox options={subclasses} value={form.subclass_id} onChange={(val) => handleChange('subclass_id', val)} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Raça</label>
                  <Combobox options={dbData.races} value={form.race_id} onChange={(val) => handleChange('race_id', val)} />
                </div>

                {subRaces.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold text-purple-400 mb-1.5 uppercase tracking-wider">Sub-raça</label>
                    <Combobox options={subRaces} value={form.sub_race_id} onChange={(val) => handleChange('sub_race_id', val)} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Antecedente</label>
                  <Combobox options={dbData.backgrounds} value={form.background_id} onChange={(val) => handleChange('background_id', val)} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Alinhamento</label>
                  <Combobox options={ALIGNMENTS} value={form.alignment} onChange={(val) => handleChange('alignment', val)} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Tamanho</label>
                  <Combobox options={SIZES} value={form.size} onChange={(val) => handleChange('size', val)} />
                </div>
              </div>
            </div>
          )}

          {/* ─── SEÇÃO 2: NÍVEL & COMBATE ─── */}
          <SectionHeader sectionKey="combat" title="Nível & Combate" icon="swords" color="text-red-400" />
          {openSections.combat && (
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <InputField label="Nível" name="level" type="number" value={form.level} placeholder="1" />
                <InputField label="XP" name="exp" type="number" value={form.exp} placeholder="0" />
                <InputField label="HP Atual" name="hit_points" type="number" value={form.hit_points} placeholder="10" />
                <InputField label="HP Máximo" name="hit_points_max" type="number" value={form.hit_points_max} placeholder="10" />
                <InputField label="CA (Armadura)" name="armor_class" type="number" value={form.armor_class} placeholder="10" />
                <InputField label="Velocidade (m)" name="speed" type="number" value={form.speed} placeholder="9" />
                <InputField label="Vel. Vôo (m)" name="speed_fly" type="number" value={form.speed_fly} placeholder="—" />
                <InputField label="Vel. Nado (m)" name="speed_swim" type="number" value={form.speed_swim} placeholder="—" />
                <InputField label="Percepção Passiva" name="passive_perception" type="number" value={form.passive_perception} placeholder="10" />
                <InputField label="Bônus Prof." name="proficiency_bonus" type="number" value={form.proficiency_bonus} placeholder="2" />
              </div>
            </div>
          )}

          {/* ─── SEÇÃO 3: ATRIBUTOS ─── */}
          <SectionHeader sectionKey="attributes" title="Atributos" icon="monitoring" color="text-emerald-400" />
          {openSections.attributes && (
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 animate-in fade-in duration-300">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {Object.entries(ATTR_LABELS).map(([key, meta]) => {
                  const value = form[key] || 10;
                  const mod = getMod(value);
                  return (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${Number(mod) >= 0
                        ? 'bg-emerald-900/40 border-emerald-700 text-emerald-400'
                        : 'bg-red-900/40 border-red-700 text-red-400'
                        }`}>
                        {mod}
                      </div>
                      <div className="w-full p-3 rounded-xl border bg-neutral-950 border-neutral-800 text-center">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{meta.label}</label>
                        <input
                          type="number" min="1" max="30"
                          value={value}
                          onChange={(e) => handleChange(key, Number(e.target.value))}
                          className="w-full bg-transparent text-center text-2xl font-black text-white focus:outline-none placeholder-neutral-800"
                          placeholder="10"
                        />
                      </div>
                      <span className="text-[9px] text-neutral-500 font-medium">{meta.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── SEÇÃO 4: PROFICIÊNCIAS ─── */}
          <SectionHeader sectionKey="proficiencies" title="Proficiências" icon="stars" color="text-blue-400" />
          {openSections.proficiencies && (
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 space-y-6 animate-in fade-in duration-300">

              {/* Saving Throws */}
              <div>
                <h3 className="text-sm font-bold text-neutral-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-emerald-400">shield</span>
                  Resistências (Saving Throws)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {savingThrows.map(st => {
                    const p = proficiencies[st.id];
                    const isProf = p?.proficient;
                    return (
                      <button key={st.id} type="button" onClick={() => toggleProficiency(st.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isProf
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                          }`}>
                        {st.name_pt || st.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-sm font-bold text-neutral-300 mb-1 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-blue-400">psychology</span>
                  Perícias
                </h3>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Clique 1x = Proficiente • Clique 2x = Expertise • Clique 3x = Remover
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => {
                    const p = proficiencies[skill.id];
                    const isProf = p?.proficient && !p?.expertise;
                    const isExpert = p?.expertise;
                    return (
                      <button key={skill.id} type="button" onClick={() => toggleProficiency(skill.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isExpert
                          ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/40'
                          : isProf
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                          }`}
                        title={isExpert ? 'Expertise' : isProf ? 'Proficiente' : 'Sem proficiência'}>
                        {skill.name_pt || skill.name}
                        {isExpert && <span className="ml-1 text-[9px] opacity-80">★★</span>}
                        {isProf && <span className="ml-1 text-[9px] opacity-80">★</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-neutral-500 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-neutral-900 border border-neutral-800 rounded-full"></span> Sem Prof.</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 border border-blue-500 rounded-full"></span> Proficiente</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-600 border border-amber-500 rounded-full"></span> Expertise</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── SEÇÃO 5: SENTIDOS & IDIOMAS ─── */}
          <SectionHeader sectionKey="sensesLangs" title="Sentidos & Idiomas" icon="translate" color="text-cyan-400" />
          {openSections.sensesLangs && (
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 space-y-6 animate-in fade-in duration-300">

              {/* Idiomas */}
              <div>
                <h3 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>translate</span>
                  Idiomas
                </h3>
                <div className="flex gap-3 items-start">
                  <div className="w-72 shrink-0">
                    <Combobox
                      options={languages}
                      value=""
                      onChange={(val) => addToList(setSelectedSensesLangs, val)}
                      placeholder="Adicionar idioma..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {selectedSensesLangs
                      .map((id, realIdx) => ({ id, realIdx }))
                      .filter(({ id }) => languages.some(l => l.id === id))
                      .map(({ id, realIdx }) => {
                        const item = languages.find(l => l.id === id);
                        return (
                          <span key={realIdx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600/20 border border-blue-500/40 text-blue-300">
                            {item?.name_pt || item?.name}
                            <button type="button" onClick={() => removeFromList(setSelectedSensesLangs, realIdx)}
                              className="ml-0.5 text-blue-300/60 hover:text-white transition-colors leading-none">
                              ×
                            </button>
                          </span>
                        );
                      })
                    }
                    {selectedSensesLangs.filter(id => languages.some(l => l.id === id)).length === 0 && (
                      <span className="text-xs text-neutral-600 italic self-center">Nenhum idioma selecionado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sentidos */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
                  Sentidos
                </h3>
                <div className="flex gap-3 items-start">
                  <div className="w-72 shrink-0">
                    <Combobox
                      options={senses}
                      value=""
                      onChange={(val) => addToList(setSelectedSensesLangs, val)}
                      placeholder="Adicionar sentido..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {selectedSensesLangs
                      .map((id, realIdx) => ({ id, realIdx }))
                      .filter(({ id }) => senses.some(s => s.id === id))
                      .map(({ id, realIdx }) => {
                        const item = senses.find(s => s.id === id);
                        return (
                          <span key={realIdx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-600/20 border border-purple-500/40 text-purple-300">
                            {item?.name_pt || item?.name}
                            <button type="button" onClick={() => removeFromList(setSelectedSensesLangs, realIdx)}
                              className="ml-0.5 text-purple-300/60 hover:text-white transition-colors leading-none">
                              ×
                            </button>
                          </span>
                        );
                      })
                    }
                    {selectedSensesLangs.filter(id => senses.some(s => s.id === id)).length === 0 && (
                      <span className="text-xs text-neutral-600 italic self-center">Nenhum sentido selecionado</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ─── SEÇÃO 6: RESISTÊNCIAS, IMUNIDADES, VULNERABILIDADES ─── */}
          <SectionHeader sectionKey="defenses" title="Resistências, Imunidades & Vulnerabilidades" icon="shield_with_heart" color="text-amber-400" />
          {openSections.defenses && (
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 space-y-6 animate-in fade-in duration-300">

              {/* Resistências */}
              <div>
                <h3 className="text-sm font-bold text-emerald-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                  Resistências a Dano
                </h3>
                <div className="flex gap-3 items-start">
                  <div className="w-72 shrink-0">
                    <Combobox
                      options={dbData.damageTypes}
                      value=""
                      onChange={(val) => addToList(setResistances, val)}
                      placeholder="Adicionar resistência..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {resistances.map((id, idx) => {
                      const item = dbData.damageTypes.find(d => d.id === id);
                      return (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-600/20 border border-emerald-500/40 text-emerald-300">
                          {item?.name_pt || id}
                          <button type="button" onClick={() => removeFromList(setResistances, idx)}
                            className="ml-0.5 text-emerald-300/60 hover:text-white transition-colors leading-none">
                            ×
                          </button>
                        </span>
                      );
                    })}
                    {resistances.length === 0 && (
                      <span className="text-xs text-neutral-600 italic self-center">Nenhuma resistência</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Imunidades */}
              <div>
                <h3 className="text-sm font-bold text-amber-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_good</span>
                  Imunidades a Dano
                </h3>
                <div className="flex gap-3 items-start">
                  <div className="w-72 shrink-0">
                    <Combobox
                      options={dbData.damageTypes}
                      value=""
                      onChange={(val) => addToList(setImmunities, val)}
                      placeholder="Adicionar imunidade..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {immunities.map((id, idx) => {
                      const item = dbData.damageTypes.find(d => d.id === id);
                      return (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-600/20 border border-amber-500/40 text-amber-300">
                          {item?.name_pt || id}
                          <button type="button" onClick={() => removeFromList(setImmunities, idx)}
                            className="ml-0.5 text-amber-300/60 hover:text-white transition-colors leading-none">
                            ×
                          </button>
                        </span>
                      );
                    })}
                    {immunities.length === 0 && (
                      <span className="text-xs text-neutral-600 italic self-center">Nenhuma imunidade</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Vulnerabilidades */}
              <div>
                <h3 className="text-sm font-bold text-red-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>crisis_alert</span>
                  Vulnerabilidades a Dano
                </h3>
                <div className="flex gap-3 items-start">
                  <div className="w-72 shrink-0">
                    <Combobox
                      options={dbData.damageTypes}
                      value=""
                      onChange={(val) => addToList(setVulnerabilities, val)}
                      placeholder="Adicionar vulnerabilidade..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {vulnerabilities.map((id, idx) => {
                      const item = dbData.damageTypes.find(d => d.id === id);
                      return (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-600/20 border border-red-500/40 text-red-300">
                          {item?.name_pt || id}
                          <button type="button" onClick={() => removeFromList(setVulnerabilities, idx)}
                            className="ml-0.5 text-red-300/60 hover:text-white transition-colors leading-none">
                            ×
                          </button>
                        </span>
                      );
                    })}
                    {vulnerabilities.length === 0 && (
                      <span className="text-xs text-neutral-600 italic self-center">Nenhuma vulnerabilidade</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ─── SEÇÃO 7: NOTAS ─── */}
          <SectionHeader sectionKey="notes" title="Notas Adicionais" icon="sticky_note_2" color="text-neutral-400" />
          {openSections.notes && (
            <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 animate-in fade-in duration-300">
              <textarea
                name="notes" value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={5}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none placeholder-neutral-600"
                placeholder="Itens especiais, talentos, multiclasse, detalhes adicionais..."
              />
            </div>
          )}

          {/* ─── SUBMIT ─── */}
          <div className="flex justify-end pt-4 pb-8">
            <button
              type="submit" disabled={submitting}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-emerald-900/30 text-sm uppercase tracking-wider"
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
