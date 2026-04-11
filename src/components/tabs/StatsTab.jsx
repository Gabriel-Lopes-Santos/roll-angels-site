import React from 'react';

// Helper D&D Modificador (Já estava sendo usado antes)
const getMod = (score) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const getAttrBadge = (attrKey) => {
  switch (attrKey) {
    case 'str': return { color: 'primary-container', label: 'FOR', name: 'Força' };
    case 'dex': return { color: 'primary-container', label: 'DES', name: 'Destreza' };
    case 'con': return { color: 'primary-container', label: 'CON', name: 'Constituição' };
    case 'int': return { color: 'secondary', label: 'INT', name: 'Inteligência' };
    case 'wis': return { color: 'secondary', label: 'SAB', name: 'Sabedoria' };
    case 'cha': return { color: 'secondary', label: 'CAR', name: 'Carisma' };
    default: return { color: 'primary', label: '', name: '' };
  }
};

export default function StatsTab({ character }) {
  const attrEntries = Object.entries(character.attributes);
  
  // Health calculations
  const hpPercent = character.stats.hpMax > 0 ? (character.stats.hpCurrent / character.stats.hpMax) * 100 : 0;
  // TODO: Add temporary HP logic if we ever implement it in db

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* Left Column */}
      <div className="xl:col-span-9 space-y-6">
        
        {/* Health Card */}
        <div className="bg-surface-container p-6 rounded relative overflow-hidden group">
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] text-primary-container uppercase">Pontos de Vida</p>
              <h3 className="font-['Space_Grotesk'] text-3xl font-black">
                {character.stats.hpCurrent} <span className="text-on-surface-variant/20">/ {character.stats.hpMax}</span>
              </h3>
            </div>
            <span className="material-symbols-outlined text-primary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </div>
          <div className="h-3 w-full bg-surface-container-highest rounded-none overflow-hidden relative z-10">
            <div className="h-full bg-gradient-to-r from-primary-container to-primary transition-all duration-500" style={{ width: `${hpPercent}%` }}></div>
          </div>
          <div className="absolute top-0 right-0 p-1 opacity-5 mix-blend-screen pointer-events-none">
            <span className="material-symbols-outlined text-9xl">favorite</span>
          </div>
        </div>

        {/* Combat Quick View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* AC Card */}
          <div className="bg-surface-container-high p-6 flex items-center gap-6 group hover:bg-surface-bright transition-all rounded">
            <div className="w-16 h-16 bg-surface-container-lowest flex items-center justify-center border border-outline-variant/15 rounded">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            </div>
            <div>
              <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase">Classe de Armadura</p>
              <p className="font-['Space_Grotesk'] text-4xl font-black">{character.stats.armorClass}</p>
            </div>
          </div>

          {/* Initiative */}
          <div className="bg-surface-container-high p-6 flex items-center gap-6 group hover:bg-surface-bright transition-all rounded">
            <div className="w-16 h-16 bg-surface-container-lowest flex items-center justify-center border border-outline-variant/15 rounded">
              <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <div>
              <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase">Iniciativa</p>
              <p className="font-['Space_Grotesk'] text-4xl font-black">{getMod(character.attributes.dex)}</p>
            </div>
          </div>
        </div>

        {/* Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attrEntries.map(([key, value]) => {
            const badge = getAttrBadge(key);
            const textClass = badge.color === 'secondary' ? 'text-secondary' : 'text-primary-container';
            const bgClass = badge.color === 'secondary' ? 'bg-secondary' : 'bg-primary-container';
            const isProficient = character.savingThrows?.[key];

            return (
              <div key={key} className={`bg-surface-container p-4 border-l-2 border-${badge.color}/20 rounded-r`}>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[9px] font-black text-on-surface-variant opacity-40 uppercase tracking-widest">{badge.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full border border-${badge.color}/50 ${isProficient ? bgClass : 'bg-transparent'}`}></div>
                    <span className={`text-[8px] font-bold ${textClass}`}>RESISTÊNCIA</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-['Space_Grotesk'] text-xl font-bold">{value}</span>
                  <span className={`text-xs font-bold ${textClass === 'text-secondary' ? 'text-secondary' : 'text-primary'}`}>
                    {getMod(value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Skills Section */}
        <div className="bg-surface-container p-6 rounded">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <h4 className="font-['Space_Grotesk'] text-xs font-black tracking-[0.2em] uppercase text-primary">PERÍCIAS</h4>
            <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-widest text-secondary">
              BÔNUS DE PROFICIÊNCIA: +{character.stats.proficiencyBonus}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-12">
            {character.skills && character.skills.map((skill) => {
              const ptAbilityLabel = skill.ability ? getAttrBadge(skill.ability.toLowerCase()).label : '';
              return (
                <div key={skill.id} className="flex items-center justify-between py-2 border-b border-white/5 hover:bg-white/5 px-2 transition-colors group">
                  <div className="flex items-center gap-3">
                    {/* Proficiency Icon */}
                    {skill.isProficient ? (
                      <div className={`w-3 h-3 border ${skill.isExpertise ? 'border-secondary/40' : 'border-primary/40'} rounded-[2px] flex items-center justify-center`}>
                        <div className={`w-1.5 h-1.5 ${skill.isExpertise ? 'bg-secondary' : 'bg-primary'} rounded-[1px]`}></div>
                      </div>
                    ) : (
                      <div className="w-3 h-3 border border-white/10 rounded-[2px]"></div>
                    )}
                    
                    <span className="text-[10px] font-black tracking-widest uppercase">
                      {skill.name} <span className="text-on-surface-variant/40 font-bold ml-1">({ptAbilityLabel})</span>
                    </span>
                  </div>
                  <span className={`text-xs font-bold ${skill.isProficient ? 'text-primary' : 'opacity-40'}`}>
                    {skill.totalMod}
                  </span>
                </div>
              );
            })}
            
            {(!character.skills || character.skills.length === 0) && (
              <div className="col-span-full py-4 text-center text-xs text-on-surface-variant/40">
                Nenhuma perícia encontrada ou carregada.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Right Column (Sidebar Quick Look) */}
      <div className="xl:col-span-3 space-y-6">
        {/* Inventory Quick List (Resumo do Ouro e Valiosos) */}
        <section className="bg-surface-container-lowest p-6 border border-outline-variant/10 rounded">
          <h4 className="font-['Space_Grotesk'] text-xs font-black tracking-widest uppercase text-tertiary mb-6">Ativos Valiosos</h4>
          <div className="space-y-1">
            <div className="flex justify-between py-2 border-b border-white/5 last:border-0">
               <span className="text-xs font-medium opacity-80">Inventário Completo</span>
               <span className="text-xs font-bold text-primary">Aba: Inv</span>
            </div>
            {/* TODO: In the future, grab character.inventory.items to put here */}
          </div>
          
          <div className="mt-8 flex items-center justify-between bg-surface-container-high p-4 rounded-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
              <span className="font-['Space_Grotesk'] text-xl font-black">{character.inventory.coins.gold}</span>
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase opacity-40">PO</span>
          </div>
        </section>

        {/* Spells Quick List Placeholder */}
        <section className="bg-surface-container p-6 rounded">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-['Space_Grotesk'] text-xs font-black tracking-widest uppercase text-secondary">Magia</h4>
            <span className="text-[10px] font-bold text-on-surface-variant/40">Abra aba de Magias</span>
          </div>
          <div className="py-4 text-center text-xs text-on-surface-variant/40">
            Acesse o grimório pelo menu.
          </div>
        </section>
      </div>

    </div>
  );
}
