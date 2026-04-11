import React, { useState, useEffect } from 'react';
import { getCharacterAppearance, upsertCharacterAppearance } from '../../lib/supabaseClient';
import { Loader2, Save, Check } from 'lucide-react';

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
      { key: 'personality_traits', label: 'Traços de Personalidade', placeholder: 'Descreva os maneirismos e temperamento do seu personagem...', multiline: true },
      { key: 'ideals', label: 'Ideais', placeholder: 'O que guia e motiva seu personagem...', multiline: true },
      { key: 'bonds', label: 'Vínculos', placeholder: 'Conexões com pessoas, lugares ou eventos...', multiline: true },
      { key: 'flaws', label: 'Defeitos', placeholder: 'Fraquezas, vícios, medos...', multiline: true },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/5 pb-4">
        <div>
          <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Identidade & Descrição</p>
          <h3 className="font-['Space_Grotesk'] text-3xl font-black">PERSONA</h3>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold font-['Space_Grotesk'] tracking-widest uppercase transition-all duration-300
            ${saved
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : hasChanges
                ? 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:scale-[1.02] active:scale-95'
                : 'bg-surface-container-high text-on-surface-variant/30 border border-white/5 cursor-not-allowed'
            }`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* Field Groups */}
      {fieldGroups.map((group) => (
        <section key={group.title} className="bg-surface-container rounded overflow-hidden">

          {/* Group Header */}
          <div className="flex items-center gap-3 px-6 py-4 bg-surface-container-high border-b border-white/5">
            <span
              className="material-symbols-outlined text-primary text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {group.icon}
            </span>
            <h4 className="font-['Space_Grotesk'] text-xs font-black tracking-[0.15em] uppercase text-primary">
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
                  className={`group ${field.fullWidth ? 'col-span-full' : ''}`}
                >
                  <label className="block text-[10px] font-black tracking-[0.15em] uppercase text-on-surface-variant/50 mb-2 font-['Space_Grotesk'] group-focus-within:text-primary transition-colors">
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={field.fullWidth ? 5 : 3}
                      className="w-full bg-surface-container-lowest text-on-surface p-3 rounded border border-white/5 
                        focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all duration-200 
                        text-sm font-['Inter'] leading-relaxed placeholder:text-on-surface-variant/20 
                        resize-y outline-none hover:border-white/10"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-surface-container-lowest text-on-surface p-3 rounded border border-white/5 
                        focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all duration-200 
                        text-sm font-['Inter'] placeholder:text-on-surface-variant/20 
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
