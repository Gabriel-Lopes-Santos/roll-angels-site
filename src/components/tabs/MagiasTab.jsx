import { BookOpen, Sparkles, Target, Zap } from 'lucide-react';

export default function MagiasTab({ character }) {
  const { magic } = character;

  // Agrupar magias por nível
  const groupedSpells = magic.spells.reduce((acc, spell) => {
    if (!acc[spell.level]) acc[spell.level] = [];
    acc[spell.level].push(spell);
    return acc;
  }, {});

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      
      {/* Header Magia */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
         <div className="flex items-center gap-3">
          <BookOpen className="text-purple-400" size={28} />
          <h2 className="text-2xl font-serif text-white tracking-widest">Grimório</h2>
         </div>
      </div>

      {/* Stats Mágicos */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black/40 border border-purple-900/30 rounded-lg p-3 text-center">
          <div className="text-xs text-purple-400 uppercase tracking-wider mb-1">Habilidade</div>
          <div className="text-xl text-white font-bold">{magic.spellCastingAbility}</div>
        </div>
        <div className="bg-black/40 border border-purple-900/30 rounded-lg p-3 text-center">
          <div className="text-xs text-purple-400 uppercase tracking-wider mb-1">CD Salvaguarda</div>
          <div className="text-xl text-white font-bold flex items-center justify-center gap-2">
            <ShieldIcon size={16} className="text-purple-500" /> {magic.spellSaveDC}
          </div>
        </div>
        <div className="bg-black/40 border border-purple-900/30 rounded-lg p-3 text-center">
          <div className="text-xs text-purple-400 uppercase tracking-wider mb-1">Bônus Ataque</div>
          <div className="text-xl text-white font-bold flex items-center justify-center gap-2">
            <Target size={16} className="text-purple-500" /> +{magic.spellAttackBonus}
          </div>
        </div>
      </div>

      {/* Lista de Magias por Nível */}
      <div className="space-y-8">
        {magic.spells.length === 0 ? (
            <div className="w-full mt-8 p-10 bg-black/40 border border-purple-900/30 rounded-lg text-center text-purple-300 font-serif italic opacity-70">
               O Sistema de Grimório Mágico estará disponível em breve...
            </div>
        ) : (
          Object.entries(groupedSpells).map(([level, spells]) => (
          <div key={level} className="space-y-4">
            <h3 className="text-lg font-serif text-[var(--color-fantasy-gold)] flex items-center gap-2 border-b border-gray-800 pb-2">
              {level === '0' ? (
                <><Sparkles size={18} /> Truques (Nível 0)</>
              ) : (
                <><Zap size={18} /> Círculo {level}</>
              )}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spells.map(spell => (
                <div 
                  key={spell.id}
                  className="bg-black/30 border border-gray-800 rounded-lg p-4 hover:border-purple-500/50 hover:bg-gray-900/50 transition-all group flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-bold group-hover:text-purple-300 transition-colors">
                      {spell.name}
                    </h4>
                    <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded border border-purple-800/50">
                      {spell.school}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed flex-1">
                    {spell.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )))}
      </div>

    </div>
  );
}

function ShieldIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    </svg>
  );
}
