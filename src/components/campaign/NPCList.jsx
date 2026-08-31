import React, { useState, useEffect } from 'react';
import { Loader2, User, Plus, Trash2, Edit, Heart, Shield, Footprints, Skull, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, getCampaignNPCs, createNPC, updateCampaignNPC, toggleNPCAlive, deleteCampaignNPC } from '../../lib/supabaseClient';

const ROLE_COLORS = {
  ally: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  enemy: 'text-red-400 bg-red-400/10 border-red-400/20',
  neutral: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20',
  quest_giver: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  merchant: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
};

const ROLE_LABELS = { ally: 'Aliado', enemy: 'Inimigo', neutral: 'Neutro', quest_giver: 'Quest Giver', merchant: 'Mercador' };
const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'TN', 'CN', 'LE', 'NE', 'CE'];

export default function NPCList({ campaignId }) {
  const navigate = useNavigate();
  const [npcs, setNpcs] = useState([]);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [aliveFilter, setAliveFilter] = useState('all');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [notesEdit, setNotesEdit] = useState('');

  const [form, setForm] = useState({
    name: '', race_id: '', role: 'neutral', alignment: 'TN', size: 'Medium',
    hit_points: 10, hit_points_max: 10, armor_class: 10, speed: 9,
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, notes: ''
  });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [npcsRes, racesRes] = await Promise.all([
      getCampaignNPCs(campaignId),
      supabase.from('race').select('id, name, name_pt').order('name_pt')
    ]);
    setNpcs(npcsRes.data || []);
    setRaces(racesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (campaignId) loadData();
  }, [campaignId]);

  const filteredNpcs = npcs.filter(npc => {
    if (roleFilter !== 'all' && npc.role !== roleFilter) return false;
    if (aliveFilter === 'alive' && !npc.is_alive) return false;
    if (aliveFilter === 'dead' && npc.is_alive) return false;
    return true;
  });

  const handleCreateSubmit = async () => {
    if (!form.name.trim()) return alert('Nome é obrigatório');
    setCreating(true);
    const { error } = await createNPC(campaignId, form);
    if (!error) {
      setShowCreateModal(false);
      setForm({ name: '', race_id: '', role: 'neutral', alignment: 'TN', size: 'Medium', hit_points: 10, hit_points_max: 10, armor_class: 10, speed: 9, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, notes: '' });
      loadData();
    } else {
      alert('Erro ao criar NPC: ' + error);
    }
    setCreating(false);
  };

  const handleToggleAlive = async (e, npc) => {
    e.stopPropagation();
    await toggleNPCAlive(npc.id, !npc.is_alive);
    loadData();
    if (selectedNPC?.id === npc.id) setSelectedNPC({ ...selectedNPC, is_alive: !npc.is_alive });
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este NPC? A ficha dele também será deletada.')) return;
    await deleteCampaignNPC(id);
    if (selectedNPC?.id === id) setSelectedNPC(null);
    loadData();
  };

  const handleSaveNotes = async () => {
    if (!selectedNPC) return;
    await updateCampaignNPC(selectedNPC.id, { notes: notesEdit });
    loadData();
    setSelectedNPC({ ...selectedNPC, notes: notesEdit });
    alert('Notas salvas com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex gap-1 flex-wrap">
            <button onClick={() => setRoleFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${roleFilter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>Todos</button>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setRoleFilter(k)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${roleFilter === k ? ROLE_COLORS[k].replace('bg-opacity-10', '') : 'text-neutral-400 hover:text-neutral-200'}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex gap-1">
            {['all', 'alive', 'dead'].map(s => (
              <button key={s} onClick={() => setAliveFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${aliveFilter === s ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
                {s === 'all' ? 'Todos Status' : s === 'alive' ? 'Vivos' : 'Mortos'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Novo NPC
        </button>
      </div>

      {/* Grid de NPCs */}
      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
      ) : filteredNpcs.length === 0 ? (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-10 text-center text-neutral-500">Nenhum NPC encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredNpcs.map(npc => {
            const sheet = npc.char_sheet;
            return (
              <div 
                key={npc.id} 
                onClick={() => { setSelectedNPC(npc); setNotesEdit(npc.notes || ''); }}
                className={`bg-neutral-900/40 border rounded-2xl p-4 cursor-pointer transition-all ${!npc.is_alive ? 'opacity-60 grayscale' : ''} hover:border-neutral-600 ${selectedNPC?.id === npc.id ? 'border-indigo-500' : 'border-neutral-800'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center border-2 border-neutral-700 shrink-0">
                    {sheet?.avatar_url ? <img src={sheet.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-neutral-500" />}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => handleToggleAlive(e, npc)} className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors" title={npc.is_alive ? 'Marcar como morto' : 'Marcar como vivo'}>
                      {npc.is_alive ? <Skull className="w-4 h-4" /> : <Heart className="w-4 h-4 text-red-400" />}
                    </button>
                    <button onClick={(e) => handleDelete(e, npc.id)} className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className={`font-bold text-lg mb-1 flex items-center gap-2 ${!npc.is_alive ? 'line-through text-neutral-400' : 'text-white'}`}>
                  {sheet?.name} {!npc.is_alive && <Skull className="w-4 h-4 text-neutral-500" />}
                </h3>
                
                <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border mb-3 ${ROLE_COLORS[npc.role]}`}>
                  {ROLE_LABELS[npc.role]}
                </span>
                
                <div className="flex items-center gap-3 text-xs text-neutral-400 font-medium bg-neutral-950 p-2 rounded-lg border border-neutral-800/50">
                  <span className="flex items-center gap-1 text-red-400" title="Hit Points"><Heart className="w-3 h-3" /> {sheet?.hit_points}/{sheet?.hit_points_max}</span>
                  <span className="flex items-center gap-1 text-blue-400" title="Armor Class"><Shield className="w-3 h-3" /> {sheet?.armor_class}</span>
                  <span className="flex items-center gap-1 text-emerald-400" title="Speed"><Footprints className="w-3 h-3" /> {sheet?.speed}m</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Painel de Detalhes do NPC (Renderizado por cima como modal por simplificação) */}
      {selectedNPC && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center border-2 border-neutral-700">
                  {selectedNPC.char_sheet?.avatar_url ? <img src={selectedNPC.char_sheet.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-neutral-500" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {selectedNPC.char_sheet?.name}
                    {!selectedNPC.is_alive && <span className="text-xs font-normal bg-red-500/20 text-red-400 px-2 py-1 rounded-md border border-red-500/30">MORT0</span>}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${ROLE_COLORS[selectedNPC.role]}`}>{ROLE_LABELS[selectedNPC.role]}</span>
                    <span className="text-xs text-neutral-400">{selectedNPC.char_sheet?.alignment} • {selectedNPC.char_sheet?.size}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedNPC(null)} className="text-neutral-500 hover:text-white bg-neutral-800/50 p-2 rounded-xl"><Trash2 className="w-5 h-5 hidden" /><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>

            {/* Atributos */}
            <div className="grid grid-cols-6 gap-2 mb-6">
              {[
                { label: 'FOR', val: selectedNPC.char_sheet?.str, color: 'text-red-400' },
                { label: 'DES', val: selectedNPC.char_sheet?.dex, color: 'text-emerald-400' },
                { label: 'CON', val: selectedNPC.char_sheet?.con, color: 'text-amber-400' },
                { label: 'INT', val: selectedNPC.char_sheet?.int, color: 'text-blue-400' },
                { label: 'SAB', val: selectedNPC.char_sheet?.wis, color: 'text-purple-400' },
                { label: 'CAR', val: selectedNPC.char_sheet?.cha, color: 'text-pink-400' }
              ].map(attr => (
                <div key={attr.label} className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-center">
                  <p className="text-[10px] font-bold text-neutral-500 mb-1">{attr.label}</p>
                  <p className={`text-lg font-bold ${attr.color}`}>{attr.val}</p>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2 font-bold">Notas do DM (Privado)</label>
              <textarea 
                value={notesEdit} 
                onChange={e => setNotesEdit(e.target.value)}
                rows={4}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-300 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Anotações secretas sobre este NPC..."
              />
              <div className="flex justify-end mt-2">
                <button onClick={handleSaveNotes} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition-colors">Salvar Notas</button>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-between items-center">
              <button 
                onClick={() => navigate(`/ficha/${selectedNPC.sheet_id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Eye className="w-4 h-4" /> Ver Ficha Completa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-6">Criar NPC (Nível 0)</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Nome *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Raça</label>
                  <select value={form.race_id} onChange={e => setForm({...form, race_id: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white">
                    <option value="">Nenhuma / Customizada</option>
                    {races.map(r => <option key={r.id} value={r.id}>{r.name_pt || r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Papel</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Alinhamento</label>
                  <select value={form.alignment} onChange={e => setForm({...form, alignment: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white">
                    {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Tamanho</label>
                  <select value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white">
                    {['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-neutral-800 pt-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">HP Máx</label>
                  <input type="number" value={form.hit_points_max} onChange={e => setForm({...form, hit_points_max: parseInt(e.target.value)||1, hit_points: parseInt(e.target.value)||1})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-red-400 font-bold" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Armor Class</label>
                  <input type="number" value={form.armor_class} onChange={e => setForm({...form, armor_class: parseInt(e.target.value)||10})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-blue-400 font-bold" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Desloc. (m)</label>
                  <input type="number" value={form.speed} onChange={e => setForm({...form, speed: parseInt(e.target.value)||9})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-emerald-400 font-bold" />
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-4">
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-3 text-center">Atributos Base</label>
                <div className="grid grid-cols-6 gap-2">
                  {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(attr => (
                    <div key={attr}>
                      <label className="block text-[10px] uppercase font-bold text-neutral-500 text-center mb-1">{attr.substring(0,3)}</label>
                      <input type="number" value={form[attr]} onChange={e => setForm({...form, [attr]: parseInt(e.target.value)||10})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-1 py-1.5 text-center text-sm font-bold text-white" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-4">
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Notas do DM</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white resize-none" placeholder="Anotações privadas iniciais..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleCreateSubmit} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar NPC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
