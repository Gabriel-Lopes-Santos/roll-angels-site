import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getAllPendingRequests, updateRequestStatus } from '../lib/supabaseClient';
import { Loader2, Shield, Check, X, User } from 'lucide-react';

const ATTR_BR = {
  str: { label: 'FOR', color: 'text-emerald-400' },
  dex: { label: 'DES', color: 'text-emerald-400' },
  con: { label: 'CON', color: 'text-emerald-400' },
  int: { label: 'INT', color: 'text-emerald-400' },
  wis: { label: 'SAB', color: 'text-emerald-400' },
  cha: { label: 'CAR', color: 'text-emerald-400' },
};

export default function DMDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== 'gabrielsantos-2003@hotmail.com') {
        navigate('/selecao'); // Redireciona não-mestre
        return;
      }
      setUser(session.user);
      
      await loadRequests();
    };
    init();
  }, [navigate]);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await getAllPendingRequests();
    setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (req) => {
    if (!window.confirm(`Tem certeza que deseja APROVAR a ficha de ${req.character_data.name}? Isso criará o registro na mesa.`)) return;
    setProcessing(true);

    try {
      const charSheetPayload = {
        name: req.character_data.name,
        owner_id: req.user_id,
        level: 1,
        type: 'character',
        str: req.character_data.attributes.str,
        dex: req.character_data.attributes.dex,
        con: req.character_data.attributes.con,
        int: req.character_data.attributes.int,
        wis: req.character_data.attributes.wis,
        cha: req.character_data.attributes.cha,
        hit_points: 10, // Placeholder
        hit_points_max: 10,
      };

      const { data: newChar, error: charErr } = await supabase
        .from('char_sheet')
        .insert([charSheetPayload])
        .select()
        .single();

      if (charErr) {
        alert("Erro ao criar na char_sheet: " + charErr.message);
        setProcessing(false);
        return;
      }

      await updateRequestStatus(req.id, 'approved');
      
      setSelectedReq(null);
      await loadRequests();

    } catch (err) {
      alert("Erro crítico: " + err.message);
    }
    setProcessing(false);
  };

  const handleReject = async (req) => {
    if (!window.confirm("Rejeitar esta solicitação?")) return;
    setProcessing(true);
    await updateRequestStatus(req.id, 'rejected');
    setSelectedReq(null);
    await loadRequests();
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-emerald-500">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-emerald-900/30">
          <div>
            <h1 className="text-3xl font-bold font-serif text-emerald-400 flex items-center gap-3 tracking-tight">
              <Shield className="w-8 h-8" />
              Painel do Mestre
            </h1>
            <p className="text-neutral-400 mt-1">Aprovação e Gerenciamento de Guilda</p>
          </div>
          <button 
            onClick={() => navigate('/selecao')}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-sm text-neutral-400 transition-colors border border-neutral-800"
          >
            Voltar para Seleção
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3 bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-neutral-900 border-b border-neutral-800">
              <h2 className="font-bold text-white">Solicitações Pendentes ({requests.length})</h2>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1 max-h-[600px]">
              {requests.length === 0 ? (
                <div className="text-center p-6 text-neutral-500">
                  Nenhuma alma procurando aventura no momento.
                </div>
              ) : (
                requests.map(req => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedReq(req)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${selectedReq?.id === req.id ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white text-sm">{req.character_data.name}</p>
                        <p className="truncate text-xs text-neutral-500">{req.character_data.class} - {req.character_data.race}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="w-full lg:w-2/3">
            {selectedReq ? (
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-neutral-800 pb-3">Revisão de Ficha</h2>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Jogador(a) (User ID)</span>
                    <p className="text-sm text-neutral-300 font-mono break-all">{selectedReq.user_id}</p>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Nome do Personagem</span>
                    <p className="font-medium text-white">{selectedReq.character_data.name}</p>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Raça / Sub-Raça</span>
                    <p className="text-white">
                      {selectedReq.character_data.race}
                      {selectedReq.character_data.sub_race ? ` (${selectedReq.character_data.sub_race})` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Classe</span>
                    <p className="text-white">{selectedReq.character_data.class}</p>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">Antecedente</span>
                    <p className="text-white">{selectedReq.character_data.background || 'Nenhum reportado'}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-end justify-between border-b border-neutral-800 pb-1 mb-3">
                    <h3 className="text-sm uppercase tracking-wider text-neutral-500">Atributos Declarados</h3>
                    <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded">
                      Rolagens utilizadas: <strong className="text-purple-400">{selectedReq.character_data.roll_count || 0}x</strong>
                    </span>
                  </div>
                  
                  <div className="flex gap-4 flex-wrap">
                    {Object.entries(selectedReq.character_data.attributes).map(([attr, val]) => {
                      const display = ATTR_BR[attr] || { label: attr, color: 'text-emerald-400' };
                      return (
                        <div key={attr} className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-center w-20">
                          <span className="block text-xs text-neutral-500 uppercase">{display.label}</span>
                          <span className={`block text-lg font-bold ${display.color}`}>{val}</span>
                        </div>
                      )
                    })}
                  </div>
                  {selectedReq.character_data.rolled_stats && (
                    <p className="text-xs text-neutral-500 mt-2">
                      Rolagens brutas do sistema na última tentativa: [{selectedReq.character_data.rolled_stats.join(', ')}]
                    </p>
                  )}
                </div>

                <div className="mb-8 space-y-4">
                  <div>
                    <h3 className="text-sm uppercase tracking-wider text-neutral-500 mb-2 border-b border-neutral-800 pb-1">Perícias Escolhidas</h3>
                    <div className="flex flex-wrap gap-2 text-sm text-neutral-300">
                       {selectedReq.character_data.skills ? 
                         selectedReq.character_data.skills.split(', ').map((skill, idx) => (
                           <span key={idx} className="bg-neutral-900 border border-neutral-700 px-3 py-1 rounded-full">{skill}</span>
                         ))
                       : 'Nenhuma selecionada'}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm uppercase tracking-wider text-neutral-500 mb-2 border-b border-neutral-800 pb-1">Notas, Magias & Sub-Classes</h3>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                      {selectedReq.character_data.notes || 'Nada reportado.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-neutral-800">
                  <button
                    onClick={() => handleApprove(selectedReq)}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Aprovar & Criar Ficha
                  </button>
                  <button
                    onClick={() => handleReject(selectedReq)}
                    disabled={processing}
                    className="px-6 flex items-center justify-center gap-2 bg-red-900/20 text-red-500 hover:bg-red-900/40 font-medium py-3 rounded-xl transition-colors disabled:opacity-50 border border-red-900/50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                    Rejeitar
                  </button>
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl text-neutral-500">
                <Shield className="w-16 h-16 opacity-20 mb-4" />
                <p>Selecione uma solicitação à esquerda para revisar.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
