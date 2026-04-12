import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  supabase,
  getAllPendingRequests,
  updateRequestStatus,
  getUserProfiles,
  createFullCreationRequest,
  getAllPendingFullRequests,
  approveFullCreation,
  updateFullRequestStatus,
} from '../lib/supabaseClient';
import { Loader2, Shield, Check, X, User, UserPlus, ScrollText } from 'lucide-react';

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

  // Level 1 requests
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);

  // Full creation requests
  const [fullRequests, setFullRequests] = useState([]);
  const [selectedFullReq, setSelectedFullReq] = useState(null);

  // DM action states
  const [processing, setProcessing] = useState(false);

  // User selection modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Active view tab
  const [activeView, setActiveView] = useState('level1'); // 'level1' | 'full'

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isDM = await isCurrentUserDM();

      if (!session || !isDM) {
        navigate('/selecao');
        return;
      }
      setUser(session.user);
      await loadAllRequests();
    };
    init();
  }, [navigate]);

  const loadAllRequests = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      getAllPendingRequests(),
      getAllPendingFullRequests(),
    ]);
    setRequests(r1.data || []);
    setFullRequests(r2.data || []);
    setLoading(false);
  };

  // --- Level 1 handlers (existing) ---
  const handleApprove = async (req) => {
    if (!window.confirm(`Aprovar a ficha de ${req.character_data.name}?`)) return;
    setProcessing(true);
    try {
      // Fetch IDs se estiverem faltando (para compatibilidade com pedidos antigos)
      let r_id = req.character_data.race_id;
      if (!r_id && req.character_data.race) {
         let { data: rData } = await supabase.from('race').select('id').eq('name', req.character_data.race).maybeSingle();
         if (!rData) {
            const { data } = await supabase.from('race').select('id').eq('name_pt', req.character_data.race).maybeSingle();
            rData = data;
         }
         if (rData) r_id = rData.id;
      }

      let sub_r_id = req.character_data.sub_race_id;
      if (!sub_r_id && req.character_data.sub_race) {
         let { data: srData } = await supabase.from('sub_race').select('id').eq('name', req.character_data.sub_race).maybeSingle();
         if (!srData) {
            const { data } = await supabase.from('sub_race').select('id').eq('name_pt', req.character_data.sub_race).maybeSingle();
            srData = data;
         }
         if (srData) sub_r_id = srData.id;
      }

      let cla_id = req.character_data.class_id;
      if (!cla_id && req.character_data.class) {
         let { data: cData } = await supabase.from('classes').select('id').eq('name', req.character_data.class).maybeSingle();
         if (!cData) {
            const { data } = await supabase.from('classes').select('id').eq('name_pt', req.character_data.class).maybeSingle();
            cData = data;
         }
         if (cData) cla_id = cData.id;
      }

      let bg_id = req.character_data.background_id;
      if (!bg_id && req.character_data.background) {
         let { data: bgData } = await supabase.from('background').select('id').eq('name', req.character_data.background).maybeSingle();
         if (!bgData) {
            const { data } = await supabase.from('background').select('id').eq('name_pt', req.character_data.background).maybeSingle();
            bgData = data;
         }
         if (bgData) bg_id = bgData.id;
      }

      const charSheetPayload = {
        name: req.character_data.name,
        owner_id: req.user_id,
        level: 1,
        type: 'character',
        race_id: r_id || null,
        sub_race_id: sub_r_id || null,
        background_id: bg_id || null,
        str: req.character_data.attributes.str,
        dex: req.character_data.attributes.dex,
        con: req.character_data.attributes.con,
        int: req.character_data.attributes.int,
        wis: req.character_data.attributes.wis,
        cha: req.character_data.attributes.cha,
        hit_points: 10,
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

      // Adicionar char_class
      if (cla_id) {
        await supabase.from('char_class').insert([{
           sheet_id: newChar.id,
           class_id: cla_id,
           subclass_id: req.character_data.subclass_id || null,
           level: 1
        }]);
      }

      // Adicionar proficiências
      if (req.character_data.skill_ids && req.character_data.skill_ids.length > 0) {
        const profRows = req.character_data.skill_ids.map(skillId => ({
           sheet_id: newChar.id,
           skill_id: skillId,
           especialization: false,
           source: 'Nível 1'
        }));
        await supabase.from('char_proficiencies').insert(profRows);
      }

      await updateRequestStatus(req.id, 'approved');
      setSelectedReq(null);
      await loadAllRequests();
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
    await loadAllRequests();
    setProcessing(false);
  };

  // --- Full creation handlers ---
  const handleOpenUserModal = async () => {
    const { data } = await getUserProfiles();
    setUserProfiles(data);
    setUserSearch('');
    setShowUserModal(true);
  };

  const handleSendFullRequest = async (targetUserId) => {
    setSendingRequest(true);
    const { error } = await createFullCreationRequest(targetUserId, user.id);
    setSendingRequest(false);
    if (error) {
      alert('Erro ao enviar solicitação: ' + (error.message || error));
    } else {
      setShowUserModal(false);
      alert('Solicitação enviada com sucesso!');
    }
  };

  const handleApproveFullReq = async (req) => {
    if (!window.confirm(`Aprovar e criar a ficha completa de "${req.character_data?.name}"?`)) return;
    setProcessing(true);
    const result = await approveFullCreation(req);
    if (result.success) {
      alert(`Ficha criada com sucesso! (ID: ${result.charSheetId})`);
      setSelectedFullReq(null);
      await loadAllRequests();
    } else {
      alert('Erro ao criar ficha: ' + result.error);
    }
    setProcessing(false);
  };

  const handleRejectFullReq = async (req) => {
    if (!window.confirm("Rejeitar esta solicitação completa?")) return;
    setProcessing(true);
    await updateFullRequestStatus(req.id, 'rejected');
    setSelectedFullReq(null);
    await loadAllRequests();
    setProcessing(false);
  };

  const filteredUsers = userProfiles.filter(u => {
    const search = userSearch.toLowerCase();
    return (u.display_name || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search);
  });

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
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-emerald-900/30 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-emerald-400 flex items-center gap-3 tracking-tight">
              <Shield className="w-8 h-8" />
              Painel do Mestre
            </h1>
            <p className="text-neutral-400 mt-1">Aprovação e Gerenciamento de Guilda</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenUserModal}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/30"
            >
              <UserPlus className="w-4 h-4" />
              Solicitar Personagem
            </button>
            <button
              onClick={() => navigate('/selecao')}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-sm text-neutral-400 transition-colors border border-neutral-800"
            >
              Voltar
            </button>
          </div>
        </header>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveView('level1'); setSelectedFullReq(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeView === 'level1'
                ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <User className="w-4 h-4" />
            Nível 1 ({requests.length})
          </button>
          <button
            onClick={() => { setActiveView('full'); setSelectedReq(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeView === 'full'
                ? 'bg-purple-900/30 border-purple-700 text-purple-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            Fichas Completas ({fullRequests.length})
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* ═══ LEFT PANEL: Request List ═══ */}
          <div className="w-full lg:w-1/3 bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-neutral-900 border-b border-neutral-800">
              <h2 className="font-bold text-white">
                {activeView === 'level1' ? `Solicitações Nível 1 (${requests.length})` : `Fichas Completas (${fullRequests.length})`}
              </h2>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1 max-h-[600px]">
              {activeView === 'level1' ? (
                requests.length === 0 ? (
                  <div className="text-center p-6 text-neutral-500">Nenhuma solicitação de nível 1 pendente.</div>
                ) : (
                  requests.map(req => (
                    <button
                      key={req.id}
                      onClick={() => { setSelectedReq(req); setSelectedFullReq(null); }}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${selectedReq?.id === req.id ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white text-sm">{req.character_data?.name || 'Sem Nome'}</p>
                          <p className="truncate text-xs text-neutral-500">{req.character_data?.class} - {req.character_data?.race}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )
              ) : (
                fullRequests.length === 0 ? (
                  <div className="text-center p-6 text-neutral-500">Nenhuma ficha completa pendente de aprovação.</div>
                ) : (
                  fullRequests.map(req => (
                    <button
                      key={req.id}
                      onClick={() => { setSelectedFullReq(req); setSelectedReq(null); }}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${selectedFullReq?.id === req.id ? 'bg-purple-900/20 border-purple-500/50' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center shrink-0">
                          <ScrollText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white text-sm">{req.character_data?.name || 'Sem Nome'}</p>
                          <p className="truncate text-xs text-neutral-500">
                            {req.character_data?._labels?.class || 'Classe?'} • Lvl {req.character_data?.level || '?'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
          </div>

          {/* ═══ RIGHT PANEL: Review Details ═══ */}
          <div className="w-full lg:w-2/3">

            {/* Level 1 Review */}
            {selectedReq && (
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-neutral-800 pb-3">Revisão de Ficha (Nível 1)</h2>

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
                      Rolagens: <strong className="text-purple-400">{selectedReq.character_data.roll_count || 0}x</strong>
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
                      );
                    })}
                  </div>
                  {selectedReq.character_data.rolled_stats && (
                    <p className="text-xs text-neutral-500 mt-2">
                      Rolagens brutas: [{selectedReq.character_data.rolled_stats.join(', ')}]
                    </p>
                  )}
                </div>

                <div className="mb-8 space-y-4">
                  <div>
                    <h3 className="text-sm uppercase tracking-wider text-neutral-500 mb-2 border-b border-neutral-800 pb-1">Perícias Escolhidas</h3>
                    <div className="flex flex-wrap gap-2 text-sm text-neutral-300">
                      {selectedReq.character_data.skills
                        ? selectedReq.character_data.skills.split(', ').map((skill, idx) => (
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
                  <button onClick={() => handleApprove(selectedReq)} disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Aprovar & Criar Ficha
                  </button>
                  <button onClick={() => handleReject(selectedReq)} disabled={processing}
                    className="px-6 flex items-center justify-center gap-2 bg-red-900/20 text-red-500 hover:bg-red-900/40 font-medium py-3 rounded-xl transition-colors disabled:opacity-50 border border-red-900/50">
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                    Rejeitar
                  </button>
                </div>
              </div>
            )}

            {/* Full Creation Review */}
            {selectedFullReq && (
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-neutral-800 pb-3">Revisão Completa de Ficha</h2>

                {(() => {
                  const d = selectedFullReq.character_data;
                  if (!d || Object.keys(d).length === 0) {
                    return <p className="text-neutral-500 text-center py-8">Jogador ainda não preencheu a ficha.</p>;
                  }

                  const labels = d._labels || {};
                  return (
                    <div className="space-y-6">
                      {/* Identity */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                        {[
                          ['Nome', d.name],
                          ['Classe', labels.class],
                          ['Subclasse', labels.subclass],
                          ['Raça', labels.race],
                          ['Sub-raça', labels.sub_race],
                          ['Antecedente', labels.background],
                          ['Alinhamento', d.alignment],
                          ['Tamanho', d.size],
                          ['Nível', d.level],
                          ['XP', d.exp],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label}>
                            <span className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">{label}</span>
                            <p className="text-sm text-white font-medium">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Combat Stats */}
                      <div>
                        <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3 border-b border-neutral-800 pb-1">Combate</h3>
                        <div className="flex flex-wrap gap-3">
                          {[
                            ['HP', `${d.hit_points}/${d.hit_points_max}`],
                            ['CA', d.armor_class],
                            ['Vel.', `${d.speed}m`],
                            ['Perc. Pass.', d.passive_perception],
                            ['Prof.', `+${d.proficiency_bonus}`],
                          ].map(([label, val]) => (
                            <div key={label} className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-center min-w-[70px]">
                              <span className="block text-[10px] text-neutral-500 uppercase">{label}</span>
                              <span className="block text-sm font-bold text-white">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Attributes */}
                      <div>
                        <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3 border-b border-neutral-800 pb-1">Atributos</h3>
                        <div className="flex gap-3 flex-wrap">
                          {Object.entries(ATTR_BR).map(([key, meta]) => (
                            <div key={key} className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-center w-20">
                              <span className="block text-xs text-neutral-500 uppercase">{meta.label}</span>
                              <span className={`block text-lg font-bold ${meta.color}`}>{d[key] || 10}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Proficiencies */}
                      {d.proficiencies && d.proficiencies.length > 0 && (
                        <div>
                          <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3 border-b border-neutral-800 pb-1">
                            Proficiências ({d.proficiencies.length})
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {d.proficiencies.map((p, i) => (
                              <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                p.expertise
                                  ? 'bg-amber-900/30 border-amber-700 text-amber-400'
                                  : 'bg-blue-900/30 border-blue-700 text-blue-300'
                              }`}>
                                ID:{p.skill_id} {p.expertise && '★★'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Senses/Languages */}
                      {d.senses_languages && d.senses_languages.length > 0 && (
                        <div>
                          <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3 border-b border-neutral-800 pb-1">
                            Sentidos & Idiomas ({d.senses_languages.length})
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {d.senses_languages.map(id => (
                              <span key={id} className="px-3 py-1 rounded-full text-xs bg-cyan-900/30 border border-cyan-700 text-cyan-300">
                                ID:{id}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* R/I/V */}
                      {[
                        ['Resistências', d.resistances, 'emerald'],
                        ['Imunidades', d.immunities, 'amber'],
                        ['Vulnerabilidades', d.vulnerabilities, 'red'],
                      ].filter(([, arr]) => arr && arr.length > 0).map(([title, arr, color]) => (
                        <div key={title}>
                          <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3 border-b border-neutral-800 pb-1">{title}</h3>
                          <div className="flex flex-wrap gap-2">
                            {arr.map(id => (
                              <span key={id} className={`px-3 py-1 rounded-full text-xs bg-${color}-900/30 border border-${color}-700 text-${color}-300`}>
                                ID:{id}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Notes */}
                      {d.notes && (
                        <div>
                          <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-2 border-b border-neutral-800 pb-1">Notas</h3>
                          <p className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-950 p-3 rounded-lg border border-neutral-800">{d.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-4 pt-4 border-t border-neutral-800">
                        <button onClick={() => handleApproveFullReq(selectedFullReq)} disabled={processing}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
                          {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                          Aprovar & Criar Ficha
                        </button>
                        <button onClick={() => handleRejectFullReq(selectedFullReq)} disabled={processing}
                          className="px-6 flex items-center justify-center gap-2 bg-red-900/20 text-red-500 hover:bg-red-900/40 font-medium py-3 rounded-xl transition-colors disabled:opacity-50 border border-red-900/50">
                          {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Empty State */}
            {!selectedReq && !selectedFullReq && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl text-neutral-500">
                <Shield className="w-16 h-16 opacity-20 mb-4" />
                <p>Selecione uma solicitação à esquerda para revisar.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ USER SELECTION MODAL ═══ */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                Solicitar Personagem
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-neutral-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400 mb-4">Selecione o jogador que deve preencher uma ficha completa.</p>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-neutral-500 mb-4"
            />
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
              {filteredUsers.length === 0 ? (
                <div className="text-center p-4 text-neutral-500 text-sm">Nenhum usuário encontrado.</div>
              ) : (
                filteredUsers.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => handleSendFullRequest(profile.id)}
                    disabled={sendingRequest}
                    className="w-full text-left p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-purple-500/50 hover:bg-purple-900/10 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-sm truncate">{profile.display_name || 'Sem nome'}</p>
                      <p className="text-xs text-neutral-500 truncate">{profile.email}</p>
                    </div>
                    {sendingRequest
                      ? <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                      : <UserPlus className="w-4 h-4 text-neutral-500 shrink-0" />
                    }
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
