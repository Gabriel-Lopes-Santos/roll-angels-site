import React, { useState, useEffect, useRef } from 'react';
import { getCharacterAppearance, upsertCharacterAppearance } from '../../lib/supabaseClient';
import { Loader2, Save, Check, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFilteredSuggestions } from '../../lib/personaSuggestions';

const fieldGroups = [
  {
    title: 'Traços Físicos',
    icon: 'face',
    fields: [
      { key: 'age', label: 'Idade', placeholder: 'Ex: 27 anos' },
      { key: 'height', label: 'Altura', placeholder: 'Ex: 1,75m' },
      { key: 'weight', label: 'Peso', placeholder: 'Ex: 70kg' },
      { key: 'eye_color', label: 'Cor dos Olhos', placeholder: 'Ex: Azul gélido' },
      { key: 'skin_color', label: 'Cor da Pele', placeholder: 'Ex: Pálida' },
      { key: 'hair_color', label: 'Cor do Cabelo', placeholder: 'Ex: Negro como a noite' },
      { key: 'gender', label: 'Gênero', placeholder: 'Ex: Masculino' },
      { key: 'body_type', label: 'Tipo Físico', placeholder: 'Ex: Atlético e esguio' },
    ]
  },
  {
    title: 'Detalhes Visuais',
    icon: 'palette',
    fields: [
      { key: 'distinctive_marks', label: 'Marcas Distintas', placeholder: 'Cicatrizes, tatuagens, marcas de nascença...', multiline: true },
      { key: 'clothing_style', label: 'Estilo de Vestimenta', placeholder: 'Roupas típicas, armaduras, adornos...', multiline: true },
    ]
  },
  {
    title: 'Personalidade',
    icon: 'psychology',
    fields: [
      { key: 'personality_traits', label: 'Traços de Personalidade', placeholder: 'Descreva os maneirismos e temperamento do seu personagem...', multiline: true, hasSuggestions: true },
      { key: 'ideals', label: 'Ideais', placeholder: 'O que guia e motiva seu personagem...', multiline: true, hasSuggestions: true },
      { key: 'bonds', label: 'Vínculos', placeholder: 'Conexões com pessoas, lugares ou eventos...', multiline: true, hasSuggestions: true },
      { key: 'flaws', label: 'Defeitos', placeholder: 'Fraquezas, vícios, medos...', multiline: true, hasSuggestions: true },
    ]
  },
  {
    title: 'História',
    icon: 'menu_book',
    fields: [
      { key: 'backstory', label: 'Backstory', placeholder: 'A história do seu personagem antes da aventura...', multiline: true, fullWidth: true },
      { key: 'notes', label: 'Notas Adicionais', placeholder: 'Qualquer informação extra sobre o personagem...', multiline: true, fullWidth: true },
    ]
  }
];

export default function PersonaTab({ character }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState({});
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);
  const [suggestionPage, setSuggestionPage] = useState(0);
  const [currentSuggestions, setCurrentSuggestions] = useState([]);
  const suggestionRef = useRef(null);

  useEffect(() => {
    async function loadAppearance() {
      setLoading(true);
      const { data } = await getCharacterAppearance(character.id);
      if (data) {
        const cleanData = { ...data };
        delete cleanData.id;
        delete cleanData.sheet_id;
        setFormData(cleanData);
        setOriginalData(cleanData);
      }
      setLoading(false);
    }
    loadAppearance();
  }, [character.id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setActiveSuggestionField(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = (fieldKey, suggestion) => {
    setFormData(prev => {
      const currentVal = prev[fieldKey] ? prev[fieldKey].trim() : '';
      let newVal = currentVal;
      
      if (currentVal) {
        newVal = currentVal + ' ' + suggestion;
      } else {
        newVal = suggestion;
      }
      
      if (newVal.length > 600) newVal = newVal.slice(0, 600); // Limite de caracteres para evitar abusos
      
      const next = { ...prev, [fieldKey]: newVal };
      setHasChanges(JSON.stringify(next) !== JSON.stringify(originalData));
      return next;
    });
    setSaved(false);
    setActiveSuggestionField(null);
  };

  const handleChange = (key, value) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(next) !== JSON.stringify(originalData));
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { success } = await upsertCharacterAppearance(character.id, formData);
    if (success) {
      setSaved(true);
      setHasChanges(false);
      setOriginalData({ ...formData });
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  // Auto-save ao detectar mudanças
  useEffect(() => {
    if (!hasChanges || saving) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, hasChanges, saving]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-sheet-accent">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/5 pb-4">
        <div>
          <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] text-sheet-accent-weak uppercase">Identidade & Descrição</p>
          <h3 className="font-['Space_Grotesk'] text-3xl font-black">PERSONA</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold font-['Space_Grotesk'] tracking-widest uppercase transition-all duration-300">
          {saving ? (
            <span className="text-sheet-accent-weak flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>
          ) : saved ? (
            <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Salvo</span>
          ) : hasChanges ? (
             <span className="text-sheet-accent-weak flex items-center gap-1 text-opacity-50">Aguardando...</span>
          ) : (
            <span className="text-white/30 flex items-center gap-1"><Check className="w-3 h-3" /> Salvo automaticamente</span>
          )}
        </div>
      </div>

      {/* Field Groups */}
      {fieldGroups.map((group) => (
        <section key={group.title} className="bg-surface-container rounded-lg border border-white/5">

          {/* Group Header */}
          <div className="flex items-center gap-3 px-6 py-4 bg-surface-container-high border-b border-white/5 rounded-t-lg">
            <span
              className="material-symbols-outlined text-sheet-accent-weak text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {group.icon}
            </span>
            <h4 className="font-['Space_Grotesk'] text-xs font-black tracking-[0.15em] uppercase text-sheet-accent-weak">
              {group.title}
            </h4>
          </div>

          {/* Fields Grid */}
          <div className="p-6">
            <div className={`grid gap-5 ${group.fields.some(f => f.fullWidth)
                ? 'grid-cols-1'
                : group.fields.some(f => f.multiline)
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}>
              {group.fields.map((field) => (
                <div
                  key={field.key}
                  className={`group relative ${field.fullWidth ? 'col-span-full' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black tracking-[0.15em] uppercase text-sheet-accent-weak font-['Space_Grotesk'] group-focus-within:text-sheet-accent transition-colors">
                      {field.label}
                    </label>
                    {field.hasSuggestions && (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeSuggestionField === field.key) {
                            setActiveSuggestionField(null);
                          } else {
                            setSuggestionPage(0);
                            setActiveSuggestionField(field.key);
                            setCurrentSuggestions(getFilteredSuggestions(field.key, character?.alignment, character?.background));
                          }
                        }}
                        className="text-sky-400/80 hover:text-sky-300 transition-colors p-1 rounded hover:bg-sky-500/10 active:scale-95"
                        title="Ideias e Sugestões"
                      >
                        <Lightbulb className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {field.hasSuggestions && activeSuggestionField === field.key && (
                    <div ref={suggestionRef} className="absolute z-20 top-8 right-0 w-[300px] bg-surface-container-high border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-3 border-b border-white/5 bg-surface-container-highest flex justify-between items-center text-[10px] font-bold text-sky-200 uppercase tracking-widest">
                        <span>✨ Dicas e Ideias</span>
                        <span className="text-[10px] font-normal text-white/40">{suggestionPage + 1}/3</span>
                      </div>
                      <ul className="max-h-64 overflow-y-auto p-1 divide-y divide-white/5 bg-surface-container-lowest/50">
                        {currentSuggestions.slice(suggestionPage * 5, (suggestionPage + 1) * 5).map((sug, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => handleSuggestionClick(field.key, sug)}
                              className="w-full text-left p-3 text-sm text-on-surface hover:text-sky-100 hover:bg-sky-500/20 rounded transition-colors leading-relaxed"
                            >
                              {sug}
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-between items-center p-1 bg-surface-container-highest border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => setSuggestionPage(p => Math.max(0, p - 1))}
                          disabled={suggestionPage === 0}
                          className="p-2 text-white/50 hover:text-white disabled:opacity-30 hover:bg-white/5 rounded transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSuggestionPage(p => Math.min(2, p + 1))}
                          disabled={suggestionPage === 2}
                          className="p-2 text-white/50 hover:text-white disabled:opacity-30 hover:bg-white/5 rounded transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {field.multiline ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={field.fullWidth ? 5 : 3}
                      className="w-full bg-surface-container-lowest text-on-surface p-3 rounded border border-white/5 
                        focus:border-sheet-accent-soft transition-all duration-200 
                        text-sm font-['Inter'] leading-relaxed placeholder-sheet-accent-faint 
                        resize-y outline-none hover:border-white/10"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-surface-container-lowest text-on-surface p-3 rounded border border-white/5 
                        focus:border-sheet-accent-soft transition-all duration-200 
                        text-sm font-['Inter'] placeholder-sheet-accent-faint 
                        outline-none hover:border-white/10 h-11"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Bottom spacer for mobile nav */}
      <div className="h-4" />
    </div>
  );
}
