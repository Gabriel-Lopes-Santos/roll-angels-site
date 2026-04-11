import { Dices } from 'lucide-react';

// Helper D&D Modificador
const getMod = (score) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const attrNames = {
  strength: 'Força',
  dexterity: 'Destreza',
  constitution: 'Constituição',
  intelligence: 'Inteligência',
  wisdom: 'Sabedoria',
  charisma: 'Carisma'
};

export default function AtributosTab({ character }) {
  const { attributes } = character;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
        <Dices className="text-[var(--color-fantasy-gold)]" size={28} />
        <h2 className="text-2xl font-serif text-white tracking-widest">Atributos</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {Object.entries(attributes).map(([key, value]) => (
          <div 
            key={key} 
            className="flex flex-col items-center justify-center p-4 bg-black/40 border border-gray-800 rounded-lg hover:border-[var(--color-fantasy-gold)]/50 hover:bg-gray-900/50 transition-colors group relative overflow-hidden"
          >
            {/* Decoração sutil de fundo hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-fantasy-gold)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <span className="text-xs md:text-sm uppercase tracking-widest text-gray-400 group-hover:text-[var(--color-fantasy-gold)] transition-colors mb-2">
              {attrNames[key]}
            </span>
            
            {/* Display do Atributo Base */}
            <div className="text-3xl font-bold text-white mb-1">
              {value}
            </div>
            
            {/* Modificador (Estilo Selo) */}
            <div className="mt-2 bg-gray-800 text-[var(--color-fantasy-gold)] px-4 py-1 rounded-full text-lg font-bold border border-gray-700 shadow-sm shadow-black">
              {getMod(value)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 border border-gray-800 rounded-lg bg-black/20 text-sm text-gray-400 text-center">
        O modificador é somado as suas rolagens de d20 para atacar, resistir ou realizar testes relacionados ao atributo.
      </div>

    </div>
  );
}
