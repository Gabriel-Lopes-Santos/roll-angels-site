import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { isCurrentUserDM } from '../lib/supabaseClient';
import {
  createVTTRoom,
  getVTTRoom,
  getVTTTokens,
  addCharacterToken,
  addMonsterToken,
  updateTokenPosition,
  updateTokenHP,
  removeToken,
  setVTTMode,
  setTurnOrder,
  advanceTurn,
  getMonstersList,
  getGroupCharactersForVTT,
  subscribeToVTTRoom,
  broadcastTokenMove,
  broadcastModeChange,
  broadcastTurnAdvance,
  broadcastTokenAdd,
  broadcastTokenRemove,
  broadcastTokenHP,
} from '../lib/vttClient';
import VTTCanvas from '../components/vtt/VTTCanvas';
import VTTSidebar from '../components/vtt/VTTSidebar';
import '../components/vtt/VTT.css';
import { ArrowLeft } from 'lucide-react';

export default function VTTPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isDM, setIsDM] = useState(false);

  const [room, setRoom] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [presences, setPresences] = useState({});
  const [selectedToken, setSelectedToken] = useState(null);

  const channelRef = useRef(null);
  const initRanRef = useRef(false); // Guard against React Strict Mode double-mount

  // ─── Init ───
  useEffect(() => {
    // React Strict Mode runs effects twice in dev — this prevents duplicate token creation
    if (initRanRef.current) return;
    initRanRef.current = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/login'); return; }
        setUser(session.user);

        const dmStatus = await isCurrentUserDM();
        setIsDM(dmStatus);

        // Get or create VTT room
        let roomData;
        const { data: existingRoom } = await getVTTRoom(sessionId);
        if (existingRoom) {
          roomData = existingRoom;
        } else if (dmStatus) {
          const { data: newRoom, error: createErr } = await createVTTRoom(sessionId);
          if (createErr) { setError('Erro ao criar sala VTT: ' + (typeof createErr === 'string' ? createErr : createErr.message || JSON.stringify(createErr))); setLoading(false); return; }
          roomData = newRoom;
        } else {
          setError('A sala VTT ainda não foi criada pelo Mestre.');
          setLoading(false);
          return;
        }

        setRoom(roomData);

        // Load tokens — always fetch fresh from DB to avoid stale state
        const { data: existingTokens } = await getVTTTokens(roomData.id);
        setTokens(existingTokens || []);

        // If DM and no tokens exist in DB yet, auto-create player tokens
        if (dmStatus && (!existingTokens || existingTokens.length === 0)) {
          const { data: chars } = await getGroupCharactersForVTT(sessionId);
          if (chars && chars.length > 0) {
            const created = [];
            for (let i = 0; i < chars.length; i++) {
              const c = chars[i];
              const { data: tok } = await addCharacterToken(roomData.id, {
                ...c,
                grid_x: 2 + i * 2,
                grid_y: 2,
              });
              if (tok) {
                created.push({ ...tok, grid_x: 2 + i * 2, grid_y: 2 });
              }
            }
            if (created.length > 0) {
              setTokens(created);
            }
          }
        }

        // Load monsters list for DM
        if (dmStatus) {
          const { data: monsterList } = await getMonstersList();
          setMonsters(monsterList || []);
        }

        // Subscribe to Realtime
        const userLabel = session.user.user_metadata?.display_name || session.user.email || 'Anônimo';
        const channel = subscribeToVTTRoom(roomData.id, session.user.id, userLabel, {
          onTokenMove: (payload) => {
            setTokens(prev => prev.map(t =>
              t.id === payload.token_id ? { ...t, grid_x: payload.grid_x, grid_y: payload.grid_y } : t
            ));
          },
          onModeChange: (payload) => {
            setRoom(prev => prev ? {
              ...prev,
              mode: payload.mode,
              turn_order: payload.turn_order,
              current_turn_index: payload.current_turn_index,
              round_number: payload.round_number,
            } : prev);
          },
          onTurnAdvance: (payload) => {
            setRoom(prev => prev ? {
              ...prev,
              current_turn_index: payload.current_turn_index,
              round_number: payload.round_number,
            } : prev);
          },
          onTokenAdd: (payload) => {
            setTokens(prev => {
              if (prev.find(t => t.id === payload.id)) return prev;
              return [...prev, payload];
            });
          },
          onTokenRemove: (payload) => {
            setTokens(prev => prev.filter(t => t.id !== payload.token_id));
          },
          onTokenHPChange: (payload) => {
            setTokens(prev => prev.map(t =>
              t.id === payload.token_id ? { ...t, hp_current: payload.hp_current } : t
            ));
          },
          onPresenceSync: (state) => {
            setPresences(state);
          },
        });

        channelRef.current = channel;
        setLoading(false);
      } catch (err) {
        console.error('VTT Init Error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, navigate]);

  // ─── Token Movement ───
  const handleTokenDrop = useCallback(async (tokenId, gridX, gridY) => {
    // Optimistic update
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, grid_x: gridX, grid_y: gridY } : t));

    // Persist
    await updateTokenPosition(tokenId, gridX, gridY);

    // Broadcast
    if (channelRef.current) {
      broadcastTokenMove(channelRef.current, tokenId, gridX, gridY, user?.id);
    }
  }, [user]);

  // ─── Can Move Token check ───
  const canMoveToken = useCallback((token) => {
    if (isDM) return true;
    if (!room) return false;

    // In exploration, player can move their own tokens
    if (room.mode === 'exploration') {
      return token.owner_id === user?.id;
    }

    // In combat, only the current turn's token can move
    if (room.mode === 'combat' && room.turn_order?.length > 0) {
      const currentTurn = room.turn_order[room.current_turn_index];
      return currentTurn?.token_id === token.id && token.owner_id === user?.id;
    }

    return false;
  }, [isDM, room, user]);

  // ─── DM: Toggle Mode ───
  const handleToggleMode = useCallback(async () => {
    if (!room || !isDM) return;
    const newMode = room.mode === 'exploration' ? 'combat' : 'exploration';
    const newTurnOrder = newMode === 'exploration' ? [] : room.turn_order;
    const newIndex = newMode === 'exploration' ? 0 : room.current_turn_index;
    const newRound = newMode === 'exploration' ? 1 : room.round_number;

    // Update DB
    await setVTTMode(room.id, newMode);
    if (newMode === 'exploration') {
      await setTurnOrder(room.id, []);
    }

    // Update state
    setRoom(prev => ({ ...prev, mode: newMode, turn_order: newTurnOrder, current_turn_index: newIndex, round_number: newRound }));

    // Broadcast
    if (channelRef.current) {
      broadcastModeChange(channelRef.current, newMode, newTurnOrder, newIndex, newRound);
    }
  }, [room, isDM]);

  // ─── DM: Start Combat with initiative ───
  const handleStartCombat = useCallback(async (order) => {
    if (!room || !isDM) return;

    await setTurnOrder(room.id, order);
    setRoom(prev => ({ ...prev, turn_order: order, current_turn_index: 0, round_number: 1 }));

    if (channelRef.current) {
      broadcastModeChange(channelRef.current, 'combat', order, 0, 1);
    }
  }, [room, isDM]);

  // ─── DM: Advance Turn ───
  const handleAdvanceTurn = useCallback(async () => {
    if (!room || !isDM || !room.turn_order?.length) return;

    const { data: updated } = await advanceTurn(
      room.id,
      room.current_turn_index,
      room.turn_order.length,
      room.round_number
    );

    if (updated) {
      setRoom(prev => ({
        ...prev,
        current_turn_index: updated.current_turn_index,
        round_number: updated.round_number,
      }));

      if (channelRef.current) {
        broadcastTurnAdvance(channelRef.current, updated.current_turn_index, updated.round_number);
      }
    }
  }, [room, isDM]);

  // ─── DM: Add Monster ───
  const handleAddMonster = useCallback(async (monster) => {
    if (!room || !isDM) return;

    const { data: newToken } = await addMonsterToken(room.id, monster);
    if (newToken) {
      setTokens(prev => [...prev, newToken]);
      if (channelRef.current) {
        broadcastTokenAdd(channelRef.current, newToken);
      }
    }
  }, [room, isDM]);

  // ─── DM: Remove Token ───
  const handleRemoveToken = useCallback(async (tokenId) => {
    if (!isDM) return;

    await removeToken(tokenId);
    setTokens(prev => prev.filter(t => t.id !== tokenId));

    if (channelRef.current) {
      broadcastTokenRemove(channelRef.current, tokenId);
    }
  }, [isDM]);

  // ─── DM: Change Token HP ───
  const handleTokenHPChange = useCallback(async (tokenId, newHP) => {
    if (!isDM) return;

    const tok = tokens.find(t => t.id === tokenId);
    const clamped = Math.max(0, Math.min(tok?.hp_max || 9999, newHP));

    await updateTokenHP(tokenId, clamped);
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, hp_current: clamped } : t));

    if (channelRef.current) {
      broadcastTokenHP(channelRef.current, tokenId, clamped);
    }
  }, [isDM, tokens]);

  // ─── Token Select ───
  const handleTokenSelect = useCallback((token) => {
    setSelectedToken(token);
  }, []);

  // ─── Current turn token id ───
  const currentTurnTokenId = room?.mode === 'combat' && room?.turn_order?.length > 0
    ? room.turn_order[room.current_turn_index]?.token_id
    : null;

  const currentTurnLabel = room?.mode === 'combat' && room?.turn_order?.length > 0
    ? room.turn_order[room.current_turn_index]?.label
    : null;

  // ─── Loading / Error ───
  if (loading) {
    return (
      <div className="vtt-loading">
        <div className="vtt-loading-spinner" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Carregando Mesa Virtual...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vtt-loading">
        <p style={{ color: '#f87171', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{error}</p>
        <button className="vtt-btn vtt-btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="vtt-page">
      {/* Canvas */}
      <VTTCanvas
        gridWidth={room?.grid_width || 30}
        gridHeight={room?.grid_height || 30}
        tokens={tokens}
        isDM={isDM}
        canMoveToken={canMoveToken}
        onTokenDrop={handleTokenDrop}
        onTokenSelect={handleTokenSelect}
        selectedTokenId={selectedToken?.id}
        mode={room?.mode || 'exploration'}
        currentTurnTokenId={currentTurnTokenId}
      />

      {/* Turn overlay */}
      {room?.mode === 'combat' && currentTurnLabel && (
        <div className="vtt-turn-overlay">
          <span className="round">Rodada {room.round_number}</span>
          <span className="turn-name">⚔ {currentTurnLabel}</span>
        </div>
      )}

      {/* Back button */}
      <div className="vtt-back-btn">
        <button className="vtt-btn vtt-btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Sair
        </button>
      </div>

      {/* Sidebar */}
      <VTTSidebar
        isDM={isDM}
        mode={room?.mode || 'exploration'}
        tokens={tokens}
        presences={presences}
        turnOrder={room?.turn_order || []}
        currentTurnIndex={room?.current_turn_index || 0}
        roundNumber={room?.round_number || 1}
        monsters={monsters}
        selectedToken={selectedToken}
        onToggleMode={handleToggleMode}
        onAddMonster={handleAddMonster}
        onRemoveToken={handleRemoveToken}
        onAdvanceTurn={handleAdvanceTurn}
        onStartCombat={handleStartCombat}
        onTokenHPChange={handleTokenHPChange}
        onSelectToken={handleTokenSelect}
      />
    </div>
  );
}
