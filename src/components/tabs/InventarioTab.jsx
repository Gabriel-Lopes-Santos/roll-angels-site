import { Coins, CircleDollarSign, CirclePlay, Backpack, PackageOpen } from 'lucide-react';

export default function InventarioTab({ character }) {
  const { inventory } = character;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
        <Backpack className="text-orange-400" size={28} />
        <h2 className="text-2xl font-serif text-white tracking-widest">Inventário</h2>
      </div>

      {/* Riquezas (Moedas) */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 bg-black/40 border border-yellow-700/30 rounded-lg p-4 flex items-center gap-4 hover:bg-black/60 transition">
          <div className="p-3 bg-yellow-900/40 rounded-full border border-yellow-700/50">
             <CircleDollarSign className="text-yellow-500" size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-wider font-bold">Ouro (PO)</div>
            <div className="text-2xl font-bold text-yellow-500">{inventory.coins.gold}</div>
          </div>
        </div>
        
        <div className="flex-1 bg-black/40 border border-gray-500/30 rounded-lg p-4 flex items-center gap-4 hover:bg-black/60 transition">
          <div className="p-3 bg-gray-700/40 rounded-full border border-gray-500/50">
             <CirclePlay className="text-gray-300" size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-wider font-bold">Prata (PP)</div>
            <div className="text-2xl font-bold text-gray-300">{inventory.coins.silver}</div>
          </div>
        </div>
        
        <div className="flex-1 bg-black/40 border border-orange-800/30 rounded-lg p-4 flex items-center gap-4 hover:bg-black/60 transition hidden md:flex">
          <div className="p-3 bg-orange-900/40 rounded-full border border-orange-800/50">
             <Coins className="text-orange-600" size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-wider font-bold">Cobre (PC)</div>
            <div className="text-2xl font-bold text-orange-600">{inventory.coins.copper}</div>
          </div>
        </div>
      </div>

      {/* Lista de Itens */}
      <div className="space-y-4">
        <h3 className="text-lg font-serif text-[var(--color-fantasy-gold)] flex items-center gap-2">
          <PackageOpen size={20} /> Equipamentos e Bens
        </h3>
        
        <div className="bg-black/30 border border-gray-800 rounded-lg overflow-hidden">
          {inventory.items.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-serif italic text-lg opacity-60">
              Sistema de Inventário em Breve...
            </div>
          ) : (
            <ul className="divide-y divide-gray-800/50">
              {inventory.items.map((item) => (
                <li key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors group">
                  <div className="flex-1">
                    <h4 className="text-white font-medium group-hover:text-[var(--color-fantasy-gold)] transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded uppercase tracking-wider hidden md:block">
                      {item.type}
                    </span>
                    <span className="text-lg font-bold text-white bg-black px-3 py-1 rounded border border-gray-700">
                      x{item.quantity}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}
