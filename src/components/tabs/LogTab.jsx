import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getCharLogEntries,
  createLogEntry,
  updateLogEntry,
  deleteLogEntry,
  getActiveSession,
} from '../../lib/supabaseClient';

/**
 * Formata data para pt-BR: dd/mm/aaaa às HH:MM
 */
function formatDatePtBr(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function LogTab({ character }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  // Edição inline
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Deletar
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadData();
  }, [character.id]);

  async function loadData() {
    setLoading(true);
    const [entriesRes, sessionRes] = await Promise.all([
      getCharLogEntries(character.id),
      getActiveSession(),
    ]);
    setEntries(entriesRes.data || []);
    setActiveSession(sessionRes.data || null);
    setLoading(false);
  }

  async function handleAddEntry() {
    if (!newContent.trim()) return;
    setSaving(true);
    const { data, error } = await createLogEntry(
      character.id,
      newContent.trim(),
      activeSession?.id || null
    );
    if (error) {
      console.error('Erro ao salvar log:', error);
      alert('Erro ao salvar registro: ' + (error.message || error));
    } else if (data) {
      setEntries(prev => [data, ...prev]);
      setNewContent('');
    }
    setSaving(false);
  }

  async function handleUpdateEntry(entryId) {
    if (!editContent.trim()) return;
    setEditSaving(true);
    const { data, error } = await updateLogEntry(entryId, editContent.trim());
    if (error) {
      alert('Erro ao atualizar: ' + (error.message || error));
    } else if (data) {
      setEntries(prev => prev.map(e => (e.id === entryId ? data : e)));
      setEditingId(null);
      setEditContent('');
    }
    setEditSaving(false);
  }

  async function handleDeleteEntry(entryId) {
    if (!window.confirm('Deseja realmente excluir este registro?')) return;
    setDeletingId(entryId);
    const { success, error } = await deleteLogEntry(entryId);
    if (success) {
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } else {
      alert('Erro ao excluir: ' + (error?.message || error));
    }
    setDeletingId(null);
  }

  function startEditing(entry) {
    setEditingId(entry.id);
    setEditContent(entry.content);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditContent('');
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-sheet-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-4">
        <div>
          <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.2em] text-sheet-accent-weak uppercase">
            Mundo e Aventuras
          </p>
          <h3 className="font-['Space_Grotesk'] text-3xl font-black">
            DIÁRIO DE JOGO
          </h3>
        </div>

        {/* Sessão ativa badge */}
        {activeSession && (
          <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
            <span className="text-xs font-bold font-['Space_Grotesk'] tracking-wider text-emerald-400 uppercase">
              Sessão {activeSession.session_number}
              {activeSession.campaigns?.title ? ` — ${activeSession.campaigns.title}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Novo bloco de texto */}
      <div className="bg-surface-container p-6 rounded border border-outline-variant/10">
        {/* Contexto de sessão ativa */}
        {activeSession && (
          <div className="flex items-center gap-2 mb-3 text-xs text-emerald-400/80 font-['Space_Grotesk'] tracking-wider">
            <span className="material-symbols-outlined text-[14px]">link</span>
            <span>
              Este registro será vinculado à Sessão {activeSession.session_number}
              {activeSession.campaigns?.title ? ` (${activeSession.campaigns.title})` : ''}
            </span>
          </div>
        )}

        <textarea
          className="w-full min-h-[150px] bg-surface-container-lowest text-on-surface p-4 rounded outline-none border border-white/5 focus:border-sheet-accent-soft transition-colors resize-y text-sm font-['Inter'] leading-relaxed placeholder-sheet-accent-faint"
          placeholder="Insira notas, acontecimentos ou informações importantes da sessão..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleAddEntry();
            }
          }}
        />

        <div className="flex justify-between items-center mt-4">
          <span className="text-[10px] text-on-surface-variant/40 font-['Space_Grotesk'] tracking-wider">
            Ctrl+Enter para salvar
          </span>
          <button
            type="button"
            onClick={handleAddEntry}
            disabled={saving || !newContent.trim()}
            className="bg-sheet-accent-subtle hover:bg-sheet-accent-muted text-sheet-accent border border-sheet-accent-soft px-6 py-2 rounded text-xs font-bold font-['Space_Grotesk'] tracking-widest uppercase transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">add</span>
            )}
            Adicionar Bloco
          </button>
        </div>
      </div>

      {/* Registros Anteriores */}
      <div className="space-y-4 pt-4">
        <p className="text-xs font-bold text-sheet-accent-weak tracking-widest uppercase font-['Space_Grotesk']">
          Registros Anteriores
          {entries.length > 0 && (
            <span className="ml-2 text-on-surface-variant/40">({entries.length})</span>
          )}
        </p>

        {entries.length === 0 ? (
          <div className="bg-surface-container-highest p-8 rounded border border-outline-variant/10 text-center">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/20 mb-2 block">book</span>
            <p className="text-sm text-on-surface-variant/40 font-['Space_Grotesk'] tracking-wider">
              Nenhum registro ainda. Comece escrevendo acima!
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const isEditing = editingId === entry.id;
            const isDeleting = deletingId === entry.id;
            const session = entry.sessions;

            return (
              <div
                key={entry.id}
                className="bg-surface-container-highest p-5 rounded border-l-2 border-sheet-accent relative group transition-all hover:bg-surface-container-high/80"
              >
                {/* Header com data e sessão */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    {session && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[12px] text-sheet-accent-weak">casino</span>
                        <span className="text-[11px] font-bold font-['Space_Grotesk'] tracking-wider text-sheet-accent-weak uppercase">
                          Sessão {session.session_number}
                          {session.title ? `: ${session.title}` : ''}
                        </span>
                      </div>
                    )}
                    {session?.campaigns?.title && (
                      <span className="text-[10px] font-['Space_Grotesk'] tracking-wider text-on-surface-variant/30 uppercase ml-5">
                        {session.campaigns.title}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[11px] text-on-surface-variant/50 font-['Space_Grotesk'] tracking-wider font-bold">
                      {formatDateShort(entry.created_at)}
                    </span>
                    <span className="text-[9px] text-on-surface-variant/30 font-mono">
                      {new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Conteúdo */}
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full min-h-[100px] bg-surface-container-lowest text-on-surface p-3 rounded outline-none border border-sheet-accent-soft text-sm font-['Inter'] leading-relaxed resize-y"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3 py-1.5 rounded text-xs font-bold font-['Space_Grotesk'] tracking-widest uppercase text-on-surface-variant/60 hover:text-on-surface transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateEntry(entry.id)}
                        disabled={editSaving || !editContent.trim()}
                        className="bg-sheet-accent-subtle hover:bg-sheet-accent-muted text-sheet-accent border border-sheet-accent-soft px-4 py-1.5 rounded text-xs font-bold font-['Space_Grotesk'] tracking-widest uppercase transition-colors flex items-center gap-1.5 disabled:opacity-40"
                      >
                        {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="material-symbols-outlined text-[14px]">check</span>}
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {entry.content}
                  </p>
                )}

                {/* Ações (visíveis no hover) */}
                {!isEditing && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ marginTop: '28px' }}
                  >
                    <button
                      type="button"
                      onClick={() => startEditing(entry)}
                      className="p-1.5 rounded hover:bg-white/5 text-on-surface-variant/40 hover:text-sheet-accent transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={isDeleting}
                      className="p-1.5 rounded hover:bg-red-500/10 text-on-surface-variant/40 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Indicador de editado */}
                {entry.updated_at && entry.updated_at !== entry.created_at && !isEditing && (
                  <span className="text-[9px] text-on-surface-variant/25 font-['Space_Grotesk'] tracking-wider mt-2 block">
                    Editado em {formatDatePtBr(entry.updated_at)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
