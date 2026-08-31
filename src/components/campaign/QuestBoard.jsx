import React, { useState, useEffect } from 'react';
import { Loader2, ScrollText, Plus, Trash2, Check, X, Star, Eye, EyeOff, Target, User, Users, Coins } from 'lucide-react';
import { getQuests, createQuest, updateQuest, deleteQuest, updateQuestObjectiveStatus, createQuestObjective, deleteQuestObjective, completeQuest } from '../../lib/supabaseClient';

export default function QuestBoard({ campaignId, groups, onQuestUpdated }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, completed, failed
  const [typeFilter, setTypeFilter] = useState('all'); // all, group, individual
  
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newObjText, setNewObjText] = useState('');

  // Create Modal State
  const [form, setForm] = useState({
    title: '', description: '', quest_type: 'group', group_id: '', assigned_sheet_id: '', 
    main: false, xp_reward: 0, gold_reward: 0, visibility: 'visible', objectives: []
  });
  const [newFormObj, setNewFormObj] = useState('');
  const [creating, setCreating] = useState(false);

  const loadQuests = async () => {
    setLoading(true);
    const { data } = await getQuests(campaignId);
    setQuests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (campaignId) loadQuests();
  }, [campaignId]);

  const filteredQuests = quests.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (typeFilter !== 'all' && q.quest_type !== typeFilter) return false;
    return true;
  });

  const handleCreateSubmit = async () => {
    if (!form.title.trim()) return alert('Título é obrigatório');
    if (form.quest_type === 'group' && !form.group_id) return alert('Selecione um grupo');
    if (form.quest_type === 'individual' && !form.assigned_sheet_id) return alert('Selecione um personagem');

    setCreating(true);
    const { error } = await createQuest({ ...form, campaign_id: campaignId });
    if (!error) {
      setShowCreateModal(false);
      setForm({ title: '', description: '', quest_type: 'group', group_id: '', assigned_sheet_id: '', main: false, xp_reward: 0, gold_reward: 0, visibility: 'visible', objectives: [] });
      loadQuests();
      if (onQuestUpdated) onQuestUpdated();
    } else {
      alert('Erro ao criar: ' + error);
    }
    setCreating(false);
  };

  const cycleObjectiveStatus = async (obj) => {
    const nextStatus = obj.status === 'pending' ? 'in_progress' : obj.status === 'in_progress' ? 'completed' : 'pending';
    await updateQuestObjectiveStatus(obj.id, nextStatus);
    loadQuests();
    if (selectedQuest) {
      setSelectedQuest({
        ...selectedQuest,
        quest_objective: selectedQuest.quest_objective.map(o => o.id === obj.id ? { ...o, status: nextStatus } : o)
      });
    }
  };

  const handleAddObjectiveToSelected = async () => {
    if (!newObjText.trim() || !selectedQuest) return;
    const { data } = await createQuestObjective(selectedQuest.id, newObjText.trim(), selectedQuest.quest_objective?.length || 0);
    if (data) {
      setNewObjText('');
      loadQuests();
      setSelectedQuest({ ...selectedQuest, quest_objective: [...(selectedQuest.quest_objective || []), data] });
    }
  };

  const handleDelObjective = async (id) => {
    await deleteQuestObjective(id);
    loadQuests();
    if (selectedQuest) {
      setSelectedQuest({ ...selectedQuest, quest_objective: selectedQuest.quest_objective.filter(o => o.id !== id) });
    }
  };

  const handleCompleteQuest = async () => {
    if (!confirm('Tem certeza que deseja completar esta quest? (Recompensas serão distribuídas)')) return;
    const result = await completeQuest(selectedQuest.id);
    if (result.success) {
      if (result.xpResults?.success) {
        alert('Quest completada e XP distribuído!');
      } else {
        alert('Quest completada!');
      }
      setSelectedQuest(null);
      loadQuests();
      if (onQuestUpdated) onQuestUpdated();
    }
  };

  const handleDeleteQuest = async () => {
    if (!confirm('Deseja realmente excluir esta quest?')) return;
    await deleteQuest(selectedQuest.id);
    setSelectedQuest(null);
    loadQuests();
  };

  const getStatusColor = (status) => {
    if (status === 'completed') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    if (status === 'failed') return 'text-red-400 bg-red-400/10 border-red-400/20';
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  };

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex gap-1">
            {['all', 'active', 'completed', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === s ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {s === 'all' ? 'Todas' : s === 'active' ? 'Ativas' : s === 'completed' ? 'Completas' : 'Falhadas'}
              </button>
            ))}
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex gap-1">
            {['all', 'group', 'individual'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  typeFilter === t ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t === 'all' ? 'Todos Tipos' : t === 'group' ? 'Grupo' : 'Individual'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Missão
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Lista */}
        <div className="flex-1 space-y-4">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 text-neutral-500 animate-spin" /></div>
          ) : filteredQuests.length === 0 ? (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-10 text-center text-neutral-500">
              Nenhuma missão encontrada com estes filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuests.map(q => {
                const isSelected = selectedQuest?.id === q.id;
                const objs = q.quest_objective || [];
                const doneObjs = objs.filter(o => o.status === 'completed').length;
                
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuest(q)}
                    className={`bg-neutral-900/40 border rounded-2xl p-5 cursor-pointer transition-all ${
                      isSelected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        {q.main && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                        {q.title}
                      </h3>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${getStatusColor(q.status)}`}>
                        {q.status === 'active' ? 'Ativa' : q.status === 'completed' ? 'Completa' : 'Falhou'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-neutral-400 line-clamp-2 mb-4">{q.description || 'Sem descrição'}</p>
                    
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-950 border border-neutral-800 ${
                        q.quest_type === 'group' ? 'text-cyan-400' : 'text-purple-400'
                      }`}>
                        {q.quest_type === 'group' ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {q.quest_type === 'group' ? (q.adventure_groups?.name || 'Grupo') : (q.assigned_char?.name || 'Individual')}
                      </span>
                      
                      {objs.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300">
                          <Target className="w-3 h-3" /> {doneObjs}/{objs.length}
                        </span>
                      )}
                      
                      {(q.xp_reward > 0 || q.gold_reward > 0) && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-amber-400">
                          <Coins className="w-3 h-3" /> Recompensas
                        </span>
                      )}
                      
                      {q.visibility === 'hidden' && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-red-400">
                          <EyeOff className="w-3 h-3" /> Secreta
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detalhes */}
        {selectedQuest && (
          <div className="w-full lg:w-[400px] shrink-0 bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 flex flex-col h-fit sticky top-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {selectedQuest.main && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
                {selectedQuest.title}
              </h2>
              <button onClick={() => setSelectedQuest(null)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <p className="text-sm text-neutral-300 whitespace-pre-wrap mb-6">{selectedQuest.description}</p>
            
            <div className="flex gap-4 mb-6">
              {selectedQuest.xp_reward > 0 && (
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 flex-1 text-center">
                  <p className="text-xs text-amber-500/70 uppercase font-bold mb-1">XP</p>
                  <p className="text-amber-400 font-bold">+{selectedQuest.xp_reward}</p>
                </div>
              )}
              {selectedQuest.gold_reward > 0 && (
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 flex-1 text-center">
                  <p className="text-xs text-amber-500/70 uppercase font-bold mb-1">Ouro</p>
                  <p className="text-amber-400 font-bold">+{selectedQuest.gold_reward}g</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">Objetivos</h4>
              <div className="space-y-2 mb-3">
                {selectedQuest.quest_objective?.map(obj => (
                  <div key={obj.id} className="flex justify-between items-center bg-neutral-950 border border-neutral-800 p-2 rounded-lg">
                    <button 
                      onClick={() => cycleObjectiveStatus(obj)}
                      className={`flex items-center gap-2 text-sm flex-1 text-left ${
                        obj.status === 'completed' ? 'text-neutral-500 line-through' : 
                        obj.status === 'in_progress' ? 'text-amber-400' : 'text-neutral-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                        obj.status === 'completed' ? 'bg-emerald-500 border-emerald-500' :
                        obj.status === 'in_progress' ? 'bg-amber-500/20 border-amber-500' : 'border-neutral-600'
                      }`}>
                        {obj.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {obj.name}
                    </button>
                    <button onClick={() => handleDelObjective(obj.id)} className="text-neutral-600 hover:text-red-400 p-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" value={newObjText} onChange={e => setNewObjText(e.target.value)}
                  placeholder="Novo objetivo..." className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button onClick={handleAddObjectiveToSelected} className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 rounded-lg text-sm transition-colors">
                  Add
                </button>
              </div>
            </div>

            <div className="mt-auto space-y-2 pt-4 border-t border-neutral-800">
              {selectedQuest.status === 'active' && (
                <>
                  <button onClick={handleCompleteQuest} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors flex justify-center gap-2">
                    <Check className="w-4 h-4" /> Completar Missão
                  </button>
                  <button onClick={async () => {
                    await updateQuest(selectedQuest.id, { status: 'failed' }); loadQuests(); setSelectedQuest(null);
                  }} className="w-full py-2.5 bg-red-950/30 text-red-400 hover:bg-red-900/50 rounded-xl text-sm font-medium transition-colors">
                    Marcar como Falha
                  </button>
                </>
              )}
              {selectedQuest.status !== 'active' && (
                <button onClick={async () => {
                  await updateQuest(selectedQuest.id, { status: 'active' }); loadQuests(); setSelectedQuest(null);
                }} className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-medium transition-colors">
                  Reativar Missão
                </button>
              )}
              <button onClick={handleDeleteQuest} className="w-full py-2.5 border border-red-900/50 text-red-500 hover:bg-red-950/30 rounded-xl text-sm font-medium transition-colors flex justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Excluir Missão
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-6">Nova Missão</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-neutral-300">
                    <input type="radio" checked={form.quest_type === 'group'} onChange={() => setForm({...form, quest_type: 'group'})} className="text-emerald-500" />
                    Missão de Grupo
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-300">
                    <input type="radio" checked={form.quest_type === 'individual'} onChange={() => setForm({...form, quest_type: 'individual'})} className="text-emerald-500" />
                    Missão Individual
                  </label>
                </div>
              </div>

              {form.quest_type === 'group' ? (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Grupo Responsável</label>
                  <select value={form.group_id} onChange={e => setForm({...form, group_id: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white">
                    <option value="">Selecione...</option>
                    {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Filtrar Grupo</label>
                    <select value={form.group_id} onChange={e => setForm({...form, group_id: e.target.value, assigned_sheet_id: ''})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white">
                      <option value="">Selecione...</option>
                      {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Personagem</label>
                    <select value={form.assigned_sheet_id} onChange={e => setForm({...form, assigned_sheet_id: e.target.value})} disabled={!form.group_id} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white disabled:opacity-50">
                      <option value="">Selecione...</option>
                      {groups?.find(g => g.id === form.group_id)?.group_members?.map(m => (
                        <option key={m.sheet_id} value={m.sheet_id}>{m.char_sheet?.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Título</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white resize-none" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input type="checkbox" checked={form.main} onChange={e => setForm({...form, main: e.target.checked})} className="rounded text-emerald-500" />
                  Quest Principal
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input type="checkbox" checked={form.visibility === 'hidden'} onChange={e => setForm({...form, visibility: e.target.checked ? 'hidden' : 'visible'})} className="rounded text-emerald-500" />
                  Oculta dos Jogadores
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Recompensa XP</label>
                  <input type="number" value={form.xp_reward} onChange={e => setForm({...form, xp_reward: parseInt(e.target.value) || 0})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-amber-400 font-bold" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Recompensa Ouro</label>
                  <input type="number" value={form.gold_reward} onChange={e => setForm({...form, gold_reward: parseInt(e.target.value) || 0})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-amber-400 font-bold" />
                </div>
              </div>

              <div className="border-t border-neutral-800 pt-4">
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">Objetivos Iniciais</label>
                <div className="space-y-2 mb-2">
                  {form.objectives.map((obj, i) => (
                    <div key={i} className="flex justify-between items-center bg-neutral-950 border border-neutral-800 p-2 rounded-lg text-sm text-neutral-300">
                      {obj}
                      <button onClick={() => setForm({...form, objectives: form.objectives.filter((_, idx) => idx !== i)})} className="text-neutral-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newFormObj} onChange={e => setNewFormObj(e.target.value)} onKeyDown={e => { if(e.key==='Enter') { e.preventDefault(); if(newFormObj.trim()){ setForm({...form, objectives: [...form.objectives, newFormObj.trim()]}); setNewFormObj(''); } } }} placeholder="Novo objetivo..." className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white" />
                  <button type="button" onClick={() => { if(newFormObj.trim()){ setForm({...form, objectives: [...form.objectives, newFormObj.trim()]}); setNewFormObj(''); } }} className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 rounded-lg text-sm">Add</button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleCreateSubmit} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar Missão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
