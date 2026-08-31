import React, { useState, useEffect } from 'react';
import { Loader2, User, Star, Plus, Sparkles } from 'lucide-react';
import { grantXP, getXPHistory } from '../../lib/supabaseClient';
import { canLevelUp, XP_THRESHOLDS } from '../../lib/levelProgression';

export default function XPManager({ campaignId, groups, onXPGranted }) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [xpAmount, setXpAmount] = useState('');
  const [xpSource, setXpSource] = useState('');
  const [mode, setMode] = useState('group'); // 'group' | 'individual'
  const [selectedSheetIds, setSelectedSheetIds] = useState([]);
  const [xpHistory, setXpHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadHistory();
    }
  }, [campaignId]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data } = await getXPHistory(campaignId);
    setXpHistory(data || []);
    setHistoryLoading(false);
  };

  const selectedGroup = groups?.find(g => g.id === selectedGroupId);

  const handleSelectGroup = (e) => {
    setSelectedGroupId(e.target.value);
    setSelectedSheetIds([]);
  };

  const toggleSheetSelection = (sheetId) => {
    setSelectedSheetIds(prev =>
      prev.includes(sheetId) ? prev.filter(id => id !== sheetId) : [...prev, sheetId]
    );
  };

  const handleSubmit = async () => {
    const amount = parseInt(xpAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    let targetIds = [];
    if (mode === 'group') {
      if (!selectedGroup) return;
      targetIds = selectedGroup.group_members.map(m => m.sheet_id);
    } else {
      if (selectedSheetIds.length === 0) return;
      targetIds = selectedSheetIds;
    }

    setLoading(true);
    const result = await grantXP(targetIds, amount, xpSource.trim(), campaignId, null);
    
    if (result.success) {
      alert(`XP concedido com sucesso para ${targetIds.length} personagem(ns)!`);
      if (result.canLevelUp && result.canLevelUp.length > 0) {
        const names = result.canLevelUp.map(c => c.name).join(', ');
        alert(`🎉 Os seguintes personagens podem subir de nível: ${names}`);
      }
      setXpAmount('');
      setXpSource('');
      setSelectedSheetIds([]);
      if (onXPGranted) onXPGranted();
      loadHistory();
    } else {
      alert('Erro ao conceder XP: ' + result.error);
    }
    setLoading(false);
  };

  const isFormValid = () => {
    const amount = parseInt(xpAmount, 10);
    if (isNaN(amount) || amount <= 0) return false;
    if (mode === 'group' && !selectedGroupId) return false;
    if (mode === 'individual' && selectedSheetIds.length === 0) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Painel Principal (Formulário e Lista) */}
        <div className="w-full lg:w-2/3 bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            Conceder Experiência (XP)
          </h2>

          {/* Seletores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Grupo Alvo</label>
              <select
                value={selectedGroupId}
                onChange={handleSelectGroup}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Selecione um grupo...</option>
                {groups?.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Modo de Distribuição</label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('group'); setSelectedSheetIds([]); }}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    mode === 'group' ? 'bg-amber-900/30 border-amber-700 text-amber-400' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  Grupo Inteiro
                </button>
                <button
                  onClick={() => setMode('individual')}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    mode === 'individual' ? 'bg-purple-900/30 border-purple-700 text-purple-400' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Membros */}
          {selectedGroup && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-medium text-neutral-300">
                Integrantes {mode === 'individual' && '(Selecione quem receberá)'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedGroup.group_members.map(m => {
                  const sheet = m.char_sheet;
                  if (!sheet) return null;
                  
                  const isSelected = selectedSheetIds.includes(sheet.id);
                  const exp = sheet.exp || 0;
                  const lvl = sheet.level || 1;
                  let nextThreshold = XP_THRESHOLDS[lvl];
                  if (nextThreshold === undefined) nextThreshold = exp; // For level 20+
                  const prevThreshold = XP_THRESHOLDS[lvl - 1] || 0;
                  const progress = Math.min(100, Math.max(0, ((exp - prevThreshold) / (nextThreshold - prevThreshold)) * 100));
                  const canLevel = canLevelUp(exp, lvl);

                  return (
                    <div
                      key={sheet.id}
                      onClick={() => mode === 'individual' && toggleSheetSelection(sheet.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        mode === 'individual' ? 'cursor-pointer' : ''
                      } ${
                        mode === 'individual' && isSelected
                          ? 'bg-purple-900/20 border-purple-500/50'
                          : mode === 'group' 
                            ? 'bg-neutral-950 border-amber-500/30'
                            : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      {mode === 'individual' && (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-purple-600 border-purple-600' : 'border-neutral-600 bg-neutral-900'
                        }`}>
                          {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                      )}
                      
                      <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                        {sheet.avatar_url ? (
                          <img src={sheet.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-neutral-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-white text-sm truncate">{sheet.name}</p>
                          <span className="text-xs text-neutral-400 font-medium">Lvl {lvl}</span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate mb-1">
                          {sheet.char_class?.[0]?.classes?.name_pt || 'Sem Classe'}
                        </p>
                        
                        {/* XP Bar */}
                        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${canLevel ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-neutral-500">{exp} / {nextThreshold} XP</span>
                          {canLevel && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <Sparkles className="w-3 h-3" /> Level Up!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Quantidade de XP</label>
              <input
                type="number"
                value={xpAmount}
                onChange={e => setXpAmount(e.target.value)}
                placeholder="Ex: 500"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Motivo (Opcional)</label>
              <input
                type="text"
                value={xpSource}
                onChange={e => setXpSource(e.target.value)}
                placeholder="Ex: Derrotar o dragão"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isFormValid() || loading}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Conceder XP
          </button>
        </div>

        {/* Painel Lateral (Histórico) */}
        <div className="w-full lg:w-1/3 bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 flex flex-col max-h-[600px]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            Histórico de XP
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
              </div>
            ) : xpHistory.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-8">Nenhum registro de XP nesta campanha.</p>
            ) : (
              xpHistory.map(entry => (
                <div key={entry.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center">
                        {entry.char_sheet?.avatar_url ? (
                          <img src={entry.char_sheet.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3 h-3 text-neutral-500" />
                        )}
                      </div>
                      <span className="font-medium text-sm text-white">{entry.char_sheet?.name || '???'}</span>
                    </div>
                    <span className="font-bold text-emerald-400 text-sm">+{entry.amount} XP</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 truncate pr-2">
                      {entry.source || 'Sem motivo'}
                    </span>
                    <span className="text-neutral-600 shrink-0">
                      {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
