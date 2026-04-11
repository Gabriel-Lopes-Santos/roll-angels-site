import { Heart, ShieldAlert, Swords } from 'lucide-react';

export default function ResumoTab({ character }) {
  const hpPercentage = Math.max(0, Math.min(100, (character.stats.hpCurrent / character.stats.hpMax) * 100));
  
  // Determinando cor da barra baseado no HP
  let hpColor = 'bg-green-500';
  if (hpPercentage <= 25) hpColor = 'bg-red-600';
  else if (hpPercentage <= 50) hpColor = 'bg-yellow-500';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Cabeçalho Resumo */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--color-fantasy-gold)]/30 shadow-lg shadow-[var(--color-fantasy-gold)]/10 shrink-0">
          <img src={character.avatar} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h2 className="text-2xl font-serif text-white tracking-wide">{character.name}</h2>
          <p className="text-[var(--color-fantasy-gold)] mb-4 text-lg">
            {character.race} • {character.class} • Nível {character.level}
          </p>
          
          <div className="flex gap-4">
            <div className="bg-black/50 border border-gray-700 px-4 py-2 rounded-md flex flex-col items-center">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Proficiência</span>
              <span className="text-xl font-bold text-white">+{character.stats.proficiencyBonus}</span>
            </div>
            <div className="bg-black/50 border border-gray-700 px-4 py-2 rounded-md flex flex-col items-center">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Deslocamento</span>
              <span className="text-xl font-bold text-white">{character.stats.speed}m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Bloco de Vida */}
        <div className="bg-black/40 p-5 rounded-lg border border-red-900/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Heart size={80} className="text-red-500" />
          </div>
          <h3 className="text-sm text-gray-400 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
            <Heart size={16} className="text-red-500" /> Pontos de Vida
          </h3>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{character.stats.hpCurrent}</span>
            <span className="text-xl text-gray-500 mb-1">/ {character.stats.hpMax}</span>
          </div>
          <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full ${hpColor} transition-all duration-1000 ease-out`}
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        {/* Bloco de CA */}
        <div className="bg-black/40 p-5 rounded-lg border border-blue-900/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert size={80} className="text-blue-500" />
          </div>
          <h3 className="text-sm text-gray-400 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-blue-500" /> Classe de Armadura
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center">
               <ShieldAlert size={64} className="text-[var(--color-fantasy-gold)] stroke-[1.5]" />
               <span className="absolute text-2xl font-bold text-white">{character.stats.armorClass}</span>
            </div>
            <p className="text-sm text-gray-400 max-w-[120px]">
              Dificuldade para ser atingido em combate.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
