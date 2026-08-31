import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, MapPin, Users, User, Zap, ScrollText, Plus, Trash2, Edit, EyeOff, Eye, Search, X } from 'lucide-react';
import { getCampaignKnowledge, createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry } from '../../lib/supabaseClient';

const CAT_ICONS = {
  lore: { icon: BookOpen, label: 'Lore', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  location: { icon: MapPin, label: 'Local', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  faction: { icon: Users, label: 'Facção', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  npc: { icon: User, label: 'NPC', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  event: { icon: Zap, label: 'Evento', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  rule: { icon: ScrollText, label: 'Regra', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' }
};

export default function CampaignKnowledge({ campaignId, sessions }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '', content: '', category: 'lore', visibility: 'all', session_id: ''
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data } = await getCampaignKnowledge(campaignId);
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (campaignId) loadData();
  }, [campaignId]);

  const filteredEntries = entries.filter(e => {
    if (catFilter !== 'all' && e.category !== catFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!e.title?.toLowerCase().includes(q) && !e.content?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ title: '', content: '', category: 'lore', visibility: 'all', session_id: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      visibility: entry.visibility,
      session_id: entry.session_id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) return alert('Título e conteúdo são obrigatórios');
    setSaving(true);
    
    let error;
    if (editingId) {
      const res = await updateKnowledgeEntry(editingId, { ...form, session_id: form.session_id || null });
      error = res.error;
    } else {
      const res = await createKnowledgeEntry(campaignId, { ...form, session_id: form.session_id || null });
      error = res.error;
    }

    if (!error) {
      setShowModal(false);
      loadData();
    } else {
      alert('Erro ao salvar: ' + error);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) return;
    await deleteKnowledgeEntry(id);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={() => setCatFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${catFilter === 'all' ? 'bg-neutral-800 text-white border border-neutral-700' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200'}`}>
            Todas
          </button>
          {Object.entries(CAT_ICONS).map(([k, v]) => {
            const Icon = v.icon;
            return (
              <button key={k} onClick={() => setCatFilter(k)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${catFilter === k ? v.color : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'}`}>
                <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{v.label}</span>
              </button>
            )
          })}
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500" />
          </div>
          <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Nova
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-10 text-center text-neutral-500">
          {searchQuery ? 'Nenhum resultado encontrado.' : 'Nenhuma entrada de conhecimento registrada.'}
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {filteredEntries.map(entry => {
            const cat = CAT_ICONS[entry.category] || CAT_ICONS.lore;
            const CatIcon = cat.icon;
            const linkedSession = entry.session_id ? sessions?.find(s => s.id === entry.session_id) : null;
            
            return (
              <div key={entry.id} className="break-inside-avoid bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-600 transition-colors group relative">
                <div className="flex justify-between items-start mb-3">
                  <span className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] uppercase font-bold tracking-wider ${cat.color}`}>
                    <CatIcon className="w-3 h-3" /> {cat.label}
                  </span>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEdit(entry)} className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-md"><Edit className="w-3 h-3" /></button>
                    <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-neutral-400 hover:text-red-400 bg-neutral-800 rounded-md"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                
                <h3 className="font-bold text-white text-lg mb-2">{entry.title}</h3>
                
                <div className="text-sm text-neutral-300 whitespace-pre-wrap font-serif leading-relaxed mb-4">
                  {entry.content}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-800/50 mt-auto">
                  {entry.visibility === 'dm_only' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500" title="Apenas o mestre pode ver"><EyeOff className="w-3 h-3" /> SÓ DM</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500/70" title="Jogadores podem ver"><Eye className="w-3 h-3" /> PÚBLICO</span>
                  )}
                  
                  {linkedSession && (
                    <span className="text-[10px] font-bold text-amber-500/70 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/30">
                      Sessão {linkedSession.session_number}
                    </span>
                  )}
                  
                  <span className="text-[10px] text-neutral-600 ml-auto">
                    {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">{editingId ? 'Editar Entrada' : 'Nova Entrada de Conhecimento'}</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Categoria</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white">
                    {Object.entries(CAT_ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Visibilidade</label>
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${form.visibility === 'all' ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-400' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'}`}>
                      <input type="radio" checked={form.visibility === 'all'} onChange={() => setForm({...form, visibility: 'all'})} className="hidden" />
                      <Eye className="w-4 h-4" /> Público
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${form.visibility === 'dm_only' ? 'bg-neutral-800 border-neutral-600 text-white' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'}`}>
                      <input type="radio" checked={form.visibility === 'dm_only'} onChange={() => setForm({...form, visibility: 'dm_only'})} className="hidden" />
                      <EyeOff className="w-4 h-4" /> Só DM
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Título</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-bold" placeholder="Ex: O Rei de Gelo, Taverna do Javali..." />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Conteúdo</label>
                <textarea 
                  value={form.content} 
                  onChange={e => setForm({...form, content: e.target.value})} 
                  rows={8} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-3 text-white font-serif resize-none focus:outline-none focus:border-purple-500" 
                  placeholder="Escreva a lore aqui..." 
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Vincular a uma Sessão (Opcional)</label>
                <select value={form.session_id} onChange={e => setForm({...form, session_id: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white">
                  <option value="">Nenhuma</option>
                  {sessions?.map(s => <option key={s.id} value={s.id}>Sessão {s.session_number} - {s.title || 'Sem título'}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
