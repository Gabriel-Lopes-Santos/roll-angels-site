import React, { useState, useMemo } from 'react';
import {
  Swords,
  Compass,
  Plus,
  Trash2,
  SkipForward,
  Users,
  Shield,
  Heart,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';

/**
 * VTTSidebar — Painel lateral da VTT.
 *
 * Props:
 *  - isDM (bool)
 *  - mode ('exploration' | 'combat')
 *  - tokens (array)
 *  - presences (object from Supabase)
 *  - turnOrder (array)
 *  - currentTurnIndex (int)
 *  - roundNumber (int)
 *  - monsters (array from monster_sheet)
 *  - selectedToken (object | null)
 *
 *  - onToggleMode()
 *  - onAddMonster(monster)
 *  - onRemoveToken(tokenId)
 *  - onAdvanceTurn()
 *  - onSetInitiative(tokenId, value)
 *  - onStartCombat(turnOrder)
 *  - onTokenHPChange(tokenId, newHP)
 *  - onSelectToken(token)
 */
export default function VTTSidebar({
  isDM = false,
  mode = 'exploration',
  tokens = [],
  presences = {},
  turnOrder = [],
  currentTurnIndex = 0,
  roundNumber = 1,
  monsters = [],
  selectedToken = null,
  onToggleMode,
  onAddMonster,
  onRemoveToken,
  onAdvanceTurn,
  onSetInitiative,
  onStartCombat,
  onTokenHPChange,
  onSelectToken,
}) {
  const [monsterSearch, setMonsterSearch] = useState('');
  const [showMonsters, setShowMonsters] = useState(false);
  const [initValues, setInitValues] = useState({});
  const [editingHP, setEditingHP] = useState(null); // tokenId
  const [hpInput, setHpInput] = useState('');
  const [showTokens, setShowTokens] = useState(true);

  const presenceList = useMemo(() => {
    const entries = [];
    Object.values(presences).forEach(pArr => {
      pArr.forEach(p => {
        if (p.label) entries.push(p);
      });
    });
    return entries;
  }, [presences]);

  const filteredMonsters = useMemo(() => {
    if (!monsterSearch) return monsters;
    return monsters.filter(m => m.name.toLowerCase().includes(monsterSearch.toLowerCase()));
  }, [monsters, monsterSearch]);

  const playerTokens = tokens.filter(t => !!t.sheet_id);
  const monsterTokens = tokens.filter(t => !!t.monster_id);

  const handleStartCombat = () => {
    // Build turn order from initiative values
    const order = tokens
      .filter(t => t.visible || isDM)
      .map(t => ({
        token_id: t.id,
        label: t.label,
        initiative: parseInt(initValues[t.id]) || 0,
        avatar_url: t.avatar_url,
        color: t.color,
      }))
      .sort((a, b) => b.initiative - a.initiative);
    onStartCombat?.(order);
  };

  const handleHPSubmit = (tokenId) => {
    const val = parseInt(hpInput);
    if (!isNaN(val)) {
      onTokenHPChange?.(tokenId, val);
    }
    setEditingHP(null);
    setHpInput('');
  };

  return (
    <aside className="vtt-sidebar">
      {/* Header */}
      <div className="vtt-sidebar-header">
        <h2>
          <Shield size={18} style={{ color: '#a78bfa' }} />
          Mesa Virtual
        </h2>
        <span className={`vtt-mode-badge ${mode}`}>
          {mode === 'exploration' ? (
            <><Compass size={12} /> Exploração</>
          ) : (
            <><Swords size={12} /> Combate</>
          )}
        </span>
      </div>

      <div className="vtt-sidebar-body">

        {/* ─── DM Controls ─── */}
        {isDM && (
          <div className="vtt-section">
            <div className="vtt-section-title">Controles do Mestre</div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <button
                className={`vtt-btn ${mode === 'exploration' ? 'vtt-btn-danger' : 'vtt-btn-success'}`}
                onClick={onToggleMode}
              >
                {mode === 'exploration' ? <><Swords size={14} /> Iniciar Combate</> : <><Compass size={14} /> Exploração</>}
              </button>
            </div>

            {/* Combat controls */}
            {mode === 'combat' && (
              <div style={{ marginBottom: 10 }}>
                {turnOrder.length === 0 ? (
                  <>
                    <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                      Defina a iniciativa de cada token e clique "Começar":
                    </p>
                    <div className="vtt-init-list" style={{ marginBottom: 8 }}>
                      {tokens.filter(t => t.visible || isDM).map(t => (
                        <div key={t.id} className="vtt-init-entry">
                          {t.avatar_url ? (
                            <img src={t.avatar_url} alt="" className="vtt-init-avatar" style={{ borderColor: t.color }} />
                          ) : (
                            <div className="vtt-init-avatar-placeholder" style={{ background: t.color, color: '#fff' }}>
                              {(t.label || '?')[0]}
                            </div>
                          )}
                          <span className="vtt-init-name">{t.label}</span>
                          <input
                            type="number"
                            className="vtt-init-input"
                            placeholder="0"
                            value={initValues[t.id] || ''}
                            onChange={e => setInitValues(prev => ({ ...prev, [t.id]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <button className="vtt-btn vtt-btn-amber" onClick={handleStartCombat} style={{ width: '100%' }}>
                      <Swords size={14} /> Começar Combate
                    </button>
                  </>
                ) : (
                  <button className="vtt-btn vtt-btn-primary" onClick={onAdvanceTurn} style={{ width: '100%' }}>
                    <SkipForward size={14} /> Próximo Turno
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Initiative Tracker (combat mode) ─── */}
        {mode === 'combat' && turnOrder.length > 0 && (
          <div className="vtt-section">
            <div className="vtt-section-title">
              Iniciativa — Rodada {roundNumber}
            </div>
            <ul className="vtt-init-list">
              {turnOrder.map((entry, i) => (
                <li key={entry.token_id} className={`vtt-init-entry ${i === currentTurnIndex ? 'active' : ''}`}>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="vtt-init-avatar" style={{ borderColor: entry.color }} />
                  ) : (
                    <div className="vtt-init-avatar-placeholder" style={{ background: entry.color || '#6b7280', color: '#fff' }}>
                      {(entry.label || '?')[0]}
                    </div>
                  )}
                  <span className="vtt-init-name">
                    {entry.label}
                    {i === currentTurnIndex && <span style={{ fontSize: 10, color: '#fbbf24', marginLeft: 4 }}>◀ Turno</span>}
                  </span>
                  <span className="vtt-init-value">{entry.initiative}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Online Players ─── */}
        <div className="vtt-section">
          <div className="vtt-section-title">
            <Users size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Online ({presenceList.length})
          </div>
          <ul className="vtt-presence-list">
            {presenceList.length === 0 ? (
              <li style={{ fontSize: 12, color: '#4a484b', padding: '6px 10px' }}>Nenhum jogador conectado</li>
            ) : (
              presenceList.map((p, i) => (
                <li key={`${p.user_id}-${i}`} className="vtt-presence-item">
                  <span className="vtt-presence-dot" />
                  <span className="vtt-presence-name">{p.label}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* ─── Tokens on Grid ─── */}
        <div className="vtt-section">
          <div className="vtt-section-title" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setShowTokens(!showTokens)}>
            <span>Tokens ({tokens.length})</span>
            {showTokens ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
          {showTokens && (
            <div className="vtt-token-list">
              {tokens.length === 0 ? (
                <p style={{ fontSize: 12, color: '#4a484b' }}>Nenhum token no grid</p>
              ) : (
                tokens.map(t => (
                  <div key={t.id} className="vtt-token-entry" style={{ cursor: 'pointer' }} onClick={() => onSelectToken?.(t)}>
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt="" className="vtt-token-avatar" style={{ borderColor: t.color }} />
                    ) : (
                      <div className="vtt-token-color" style={{ background: t.color }}>
                        {(t.label || '?')[0]}
                      </div>
                    )}
                    <div className="vtt-token-info">
                      <div className="vtt-token-name">{t.label}</div>
                      {t.hp_max && (isDM || !t.monster_id) && (
                        <div className="vtt-token-hp">
                          <Heart size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                          {editingHP === t.id ? (
                            <span className="vtt-hp-editor" onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                className="vtt-hp-input"
                                value={hpInput}
                                autoFocus
                                onChange={e => setHpInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleHPSubmit(t.id); if (e.key === 'Escape') setEditingHP(null); }}
                                onBlur={() => handleHPSubmit(t.id)}
                              />
                              <span style={{ color: '#4a484b' }}>/ {t.hp_max}</span>
                            </span>
                          ) : (
                            <span
                              style={{ cursor: isDM ? 'pointer' : 'default' }}
                              onClick={e => {
                                if (isDM) {
                                  e.stopPropagation();
                                  setEditingHP(t.id);
                                  setHpInput(String(t.hp_current ?? ''));
                                }
                              }}
                            >
                              {t.hp_current ?? '?'}/{t.hp_max}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {isDM && (
                      <button
                        className="vtt-btn vtt-btn-danger"
                        style={{ padding: '4px 6px', minWidth: 'auto' }}
                        title="Remover token"
                        onClick={e => { e.stopPropagation(); onRemoveToken?.(t.id); }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ─── Add Monsters (DM only) ─── */}
        {isDM && (
          <div className="vtt-section">
            <div className="vtt-section-title" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setShowMonsters(!showMonsters)}>
              <span>Adicionar Monstro</span>
              {showMonsters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
            {showMonsters && (
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: '#4a484b' }} />
                  <input
                    type="text"
                    className="vtt-monster-search"
                    placeholder="Buscar monstro..."
                    value={monsterSearch}
                    onChange={e => setMonsterSearch(e.target.value)}
                    style={{ paddingLeft: 30 }}
                  />
                </div>
                <div className="vtt-monster-list">
                  {filteredMonsters.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#4a484b', padding: '8px 0' }}>Nenhum monstro encontrado</p>
                  ) : (
                    filteredMonsters.map(m => (
                      <div key={m.id} className="vtt-monster-item" onClick={() => onAddMonster?.(m)}>
                        <div>
                          <div className="vtt-monster-name">{m.name}</div>
                          <div className="vtt-monster-meta">
                            CA {m.armor_class} • HP {m.hit_points_max} • {m.size}
                          </div>
                        </div>
                        <Plus size={14} style={{ color: '#6b7280' }} />
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
