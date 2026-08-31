import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Users, ScrollText, UserCog, BookOpen, Star } from 'lucide-react';
import { getCampaignById, getCampaignGroups, getCampaignSessions } from '../lib/supabaseClient';
import XPManager from '../components/campaign/XPManager';
import QuestBoard from '../components/campaign/QuestBoard';
import NPCList from '../components/campaign/NPCList';
import CampaignKnowledge from '../components/campaign/CampaignKnowledge';

export default function CampaignControl() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState(null);
  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const [campRes, groupsRes, sessionsRes] = await Promise.all([
        getCampaignById(campaignId),
        getCampaignGroups(campaignId),
        getCampaignSessions(campaignId)
      ]);
      
      if (campRes.error) throw new Error(campRes.error);
      
      setCampaign(campRes.data);
      setGroups(groupsRes.data || []);
      setSessions(sessionsRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar campanha:', err);
      alert('Erro ao carregar campanha.');
      navigate('/mestre');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (campaignId) {
      loadData();
    }
  }, [campaignId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => navigate('/mestre')}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              {campaign.title}
              <span className={`text-xs px-2 py-1 rounded-full border uppercase tracking-wider font-medium ${
                campaign.status === 'active' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' :
                campaign.status === 'paused' ? 'bg-amber-900/30 text-amber-400 border-amber-800' :
                'bg-blue-900/30 text-blue-400 border-blue-800'
              }`}>
                {campaign.status === 'active' ? 'Ativa' : campaign.status === 'paused' ? 'Pausada' : 'Concluída'}
              </span>
            </h1>
            {campaign.description && (
              <p className="text-neutral-400 mt-2 max-w-2xl">{campaign.description}</p>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="flex overflow-x-auto gap-2 pb-2 border-b border-neutral-800 hide-scrollbar">
          {[
            { id: 'overview', label: 'Visão Geral', icon: Users },
            { id: 'xp', label: 'Gerenciar XP', icon: Star },
            { id: 'quests', label: 'Missões', icon: ScrollText },
            { id: 'npcs', label: 'NPCs', icon: UserCog },
            { id: 'knowledge', label: 'Conhecimento', icon: BookOpen }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20' 
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Grupos Vinculados</h3>
                {groups.length === 0 ? (
                  <p className="text-sm text-neutral-500">Nenhum grupo vinculado.</p>
                ) : (
                  <div className="space-y-4">
                    {groups.map(g => (
                      <div key={g.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                        <p className="font-bold text-cyan-400">{g.name}</p>
                        <p className="text-xs text-neutral-500 mt-1">{g.group_members?.length || 0} integrantes</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Últimas Sessões</h3>
                {sessions.length === 0 ? (
                  <p className="text-sm text-neutral-500">Nenhuma sessão registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.slice(0, 5).map(s => (
                      <div key={s.id} className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-amber-400 text-sm">Sessão {s.session_number}</p>
                          <p className="text-xs text-neutral-400 truncate w-32 sm:w-48">{s.title || 'Sem título'}</p>
                        </div>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(s.started_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Ações Rápidas</h3>
                <div className="space-y-3">
                  <button onClick={() => setActiveTab('xp')} className="w-full text-left p-3 rounded-xl bg-amber-950/20 text-amber-400 hover:bg-amber-900/30 transition-colors text-sm border border-amber-900/50">
                    Conceder XP
                  </button>
                  <button onClick={() => setActiveTab('quests')} className="w-full text-left p-3 rounded-xl bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30 transition-colors text-sm border border-emerald-900/50">
                    Nova Missão
                  </button>
                  <button onClick={() => setActiveTab('npcs')} className="w-full text-left p-3 rounded-xl bg-indigo-950/20 text-indigo-400 hover:bg-indigo-900/30 transition-colors text-sm border border-indigo-900/50">
                    Novo NPC
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'xp' && (
            <XPManager 
              campaignId={campaignId} 
              groups={groups} 
              onXPGranted={loadData}
            />
          )}

          {activeTab === 'quests' && (
            <QuestBoard 
              campaignId={campaignId}
              groups={groups}
              onQuestUpdated={loadData}
            />
          )}

          {activeTab === 'npcs' && (
            <NPCList 
              campaignId={campaignId}
            />
          )}

          {activeTab === 'knowledge' && (
            <CampaignKnowledge 
              campaignId={campaignId}
              sessions={sessions}
            />
          )}
        </div>
      </div>
    </div>
  );
}
