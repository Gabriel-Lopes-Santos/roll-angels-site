import { supabase } from './supabaseClient';

// =====================================================================
// VTT — Virtual Tabletop Client (Supabase)
// =====================================================================

/**
 * Cria uma sala VTT vinculada a uma sessão ativa.
 */
export async function createVTTRoom(sessionId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { data: null, error: 'Não autenticado' };

    const { data, error } = await supabase
      .from('vtt_rooms')
      .insert([{
        session_id: sessionId,
        created_by: session.user.id,
      }])
      .select()
      .single();

    if (error && error.code === '23505') {
      // Sala já existe para esta sessão, buscar a existente
      return getVTTRoom(sessionId);
    }

    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Busca a sala VTT de uma sessão.
 */
export async function getVTTRoom(sessionId) {
  try {
    const { data, error } = await supabase
      .from('vtt_rooms')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Busca todos os tokens de uma sala VTT.
 */
export async function getVTTTokens(roomId) {
  try {
    const { data, error } = await supabase
      .from('vtt_tokens')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

/**
 * Adiciona um token de personagem à sala VTT.
 */
export async function addCharacterToken(roomId, sheet) {
  try {
    const { data, error } = await supabase
      .from('vtt_tokens')
      .insert([{
        room_id: roomId,
        sheet_id: sheet.id,
        label: sheet.name,
        avatar_url: sheet.avatar_url || null,
        color: '#8b5cf6',
        grid_x: Math.floor(Math.random() * 5) + 1,
        grid_y: Math.floor(Math.random() * 5) + 1,
        size: 1,
        hp_current: sheet.hit_points ?? null,
        hp_max: sheet.hit_points_max ?? null,
        owner_id: sheet.owner_id,
      }])
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Adiciona um token de monstro à sala VTT (DM only).
 */
export async function addMonsterToken(roomId, monster, gridX = 15, gridY = 15) {
  try {
    // Converter tamanho para grid cells
    const sizeMap = { Tiny: 1, Small: 1, Medium: 1, Large: 2, Huge: 3, Gargantuan: 4 };
    const tokenSize = sizeMap[monster.size] || 1;

    const { data, error } = await supabase
      .from('vtt_tokens')
      .insert([{
        room_id: roomId,
        monster_id: monster.id,
        label: monster.name,
        avatar_url: null,
        color: '#ef4444',
        grid_x: gridX,
        grid_y: gridY,
        size: tokenSize,
        hp_current: monster.hit_points ?? monster.hit_points_max,
        hp_max: monster.hit_points_max,
        owner_id: null, // DM controla
      }])
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Atualiza a posição de um token no grid.
 */
export async function updateTokenPosition(tokenId, gridX, gridY) {
  try {
    const { data, error } = await supabase
      .from('vtt_tokens')
      .update({ grid_x: gridX, grid_y: gridY })
      .eq('id', tokenId)
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Atualiza o HP de um token.
 */
export async function updateTokenHP(tokenId, hpCurrent) {
  try {
    const { data, error } = await supabase
      .from('vtt_tokens')
      .update({ hp_current: hpCurrent })
      .eq('id', tokenId)
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Remove um token da sala VTT.
 */
export async function removeToken(tokenId) {
  try {
    const { error } = await supabase
      .from('vtt_tokens')
      .delete()
      .eq('id', tokenId);
    return { success: !error, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Alterna o modo da sala VTT (exploration ↔ combat).
 */
export async function setVTTMode(roomId, mode) {
  try {
    const update = { mode };
    if (mode === 'combat') {
      update.round_number = 1;
      update.current_turn_index = 0;
    }
    const { data, error } = await supabase
      .from('vtt_rooms')
      .update(update)
      .eq('id', roomId)
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Salva a ordem de iniciativa na sala VTT.
 * turnOrder = [{ token_id, label, initiative, avatar_url, color }]
 */
export async function setTurnOrder(roomId, turnOrder) {
  try {
    const { data, error } = await supabase
      .from('vtt_rooms')
      .update({ turn_order: turnOrder, current_turn_index: 0, round_number: 1 })
      .eq('id', roomId)
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Avança o turno (incrementa current_turn_index, round se ciclar).
 */
export async function advanceTurn(roomId, currentIndex, totalEntries, currentRound) {
  try {
    const nextIndex = (currentIndex + 1) % totalEntries;
    const nextRound = nextIndex === 0 ? currentRound + 1 : currentRound;

    const { data, error } = await supabase
      .from('vtt_rooms')
      .update({ current_turn_index: nextIndex, round_number: nextRound })
      .eq('id', roomId)
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Busca todos os monstros disponíveis do monster_sheet.
 */
export async function getMonstersList() {
  try {
    const { data, error } = await supabase
      .from('monster_sheet')
      .select('id, name, size, alignment, armor_class, hit_points_max, hit_points, speed, str, dex, con, int, wis, cha, challange_class')
      .order('name', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

/**
 * Busca informações de personagens do grupo para criar tokens automaticamente.
 */
export async function getGroupCharactersForVTT(sessionId) {
  try {
    const { data: participants, error } = await supabase
      .from('session_participants')
      .select('sheet_id, char_sheet(id, name, avatar_url, hit_points, hit_points_max, speed, owner_id)')
      .eq('session_id', sessionId);
    if (error) return { data: [], error };
    return {
      data: (participants || [])
        .filter(p => p.char_sheet)
        .map(p => p.char_sheet),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

// =====================================================================
// SUPABASE REALTIME — Canal VTT
// =====================================================================

/**
 * Inscreve no canal Realtime da sala VTT.
 * Retorna o canal para cleanup.
 *
 * callbacks:
 *  - onTokenMove({ token_id, grid_x, grid_y, moved_by })
 *  - onModeChange({ mode, turn_order, current_turn_index, round_number })
 *  - onTurnAdvance({ current_turn_index, round_number })
 *  - onTokenAdd(token)
 *  - onTokenRemove({ token_id })
 *  - onTokenHPChange({ token_id, hp_current })
 *  - onPresenceSync(presences)
 */
export function subscribeToVTTRoom(roomId, userId, userLabel, callbacks = {}) {
  const channelName = `vtt-room-${roomId}`;

  // Remove any existing channel with the same name (handles React Strict Mode double-mount)
  const existing = supabase.getChannels().find(ch => ch.topic === `realtime:${channelName}`);
  if (existing) {
    supabase.removeChannel(existing);
  }

  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: true }, presence: { key: userId } },
  });

  // ALL listeners (broadcast + presence) MUST be registered before .subscribe()
  channel
    .on('broadcast', { event: 'token_move' }, ({ payload }) => {
      callbacks.onTokenMove?.(payload);
    })
    .on('broadcast', { event: 'mode_change' }, ({ payload }) => {
      callbacks.onModeChange?.(payload);
    })
    .on('broadcast', { event: 'turn_advance' }, ({ payload }) => {
      callbacks.onTurnAdvance?.(payload);
    })
    .on('broadcast', { event: 'token_add' }, ({ payload }) => {
      callbacks.onTokenAdd?.(payload);
    })
    .on('broadcast', { event: 'token_remove' }, ({ payload }) => {
      callbacks.onTokenRemove?.(payload);
    })
    .on('broadcast', { event: 'token_hp' }, ({ payload }) => {
      callbacks.onTokenHPChange?.(payload);
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      callbacks.onPresenceSync?.(state);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, label: userLabel, joined_at: new Date().toISOString() });
      }
    });

  return channel;
}

/**
 * Envia um broadcast de movimento de token.
 */
export function broadcastTokenMove(channel, tokenId, gridX, gridY, movedBy) {
  channel.send({
    type: 'broadcast',
    event: 'token_move',
    payload: { token_id: tokenId, grid_x: gridX, grid_y: gridY, moved_by: movedBy },
  });
}

/**
 * Envia um broadcast de mudança de modo.
 */
export function broadcastModeChange(channel, mode, turnOrder, currentTurnIndex, roundNumber) {
  channel.send({
    type: 'broadcast',
    event: 'mode_change',
    payload: { mode, turn_order: turnOrder, current_turn_index: currentTurnIndex, round_number: roundNumber },
  });
}

/**
 * Envia um broadcast de avanço de turno.
 */
export function broadcastTurnAdvance(channel, currentTurnIndex, roundNumber) {
  channel.send({
    type: 'broadcast',
    event: 'turn_advance',
    payload: { current_turn_index: currentTurnIndex, round_number: roundNumber },
  });
}

/**
 * Envia broadcast de novo token.
 */
export function broadcastTokenAdd(channel, token) {
  channel.send({
    type: 'broadcast',
    event: 'token_add',
    payload: token,
  });
}

/**
 * Envia broadcast de remoção de token.
 */
export function broadcastTokenRemove(channel, tokenId) {
  channel.send({
    type: 'broadcast',
    event: 'token_remove',
    payload: { token_id: tokenId },
  });
}

/**
 * Envia broadcast de alteração de HP.
 */
export function broadcastTokenHP(channel, tokenId, hpCurrent) {
  channel.send({
    type: 'broadcast',
    event: 'token_hp',
    payload: { token_id: tokenId, hp_current: hpCurrent },
  });
}
