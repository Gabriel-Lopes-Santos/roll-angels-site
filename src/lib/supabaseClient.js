import { createClient } from '@supabase/supabase-js';
import { normalizeSheetAccent } from './sheetTheme.js';

const supabaseUrl = 'https://zpcpcydqutomotjybuge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3BjeWRxdXRvbW90anlidWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjkwNDgsImV4cCI6MjA4MzQwNTA0OH0.yXAdoOu53FjReFna8aLsx79HQtBZ1-tTnL1YxXPG5yQ';

// Usa sessionStorage (some ao fechar o browser) ou localStorage (persiste),
// dependendo da preferência "Lembre-me" salva pelo usuário no último login.
const getAuthStorage = () => {
  const rememberMe = localStorage.getItem('ra_remember_me');
  return rememberMe === 'false' ? window.sessionStorage : window.localStorage;
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: getAuthStorage(),
    autoRefreshToken: true,
    persistSession: true,
  },
});

/** Persiste a cor de tema da ficha em user_metadata (sheet_accent). */
export async function updateUserSheetAccent(hex) {
  try {
    const accent = normalizeSheetAccent(hex);
    const { error } = await supabase.auth.updateUser({
      data: { sheet_accent: accent },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, accent };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function getCharacterProfile(charSheetId) {
  try {
    if (!charSheetId) {
      return { data: null, error: "Nenhum ID de ficha fornecido." };
    }


    // Buscar lista de todas as perícias globais (saving_skills com type = skill ou saving throw)
    const { data: globalSkills } = await supabase
      .from('savings_skills')
      .select('*')
      .in('type', ['skill', 'saving throw'])
      .order('name_pt', { ascending: true });

    // 2. Buscar a ficha específica e proficiências relacionadas
    const { data: charData, error: charError } = await supabase
      .from('char_sheet')
      .select(`
        *,
        race(name, name_pt),
        sub_race(name, name_pt),
        char_class(level, classes(name, name_pt)),
        char_proficiencies(skill_id, especialization)
      `)
      .eq('id', charSheetId)
      .maybeSingle();

    if (charError || !charData) {
      console.error("Erro ao buscar ficha.", charError);
      return { data: null, error: "Erro ao buscar ficha do personagem." };
    }

    // Adaptando o char_class
    const cls = charData.char_class?.[0]?.classes;
    const charClassDetails =
      cls ? (cls.name_pt || cls.name || 'Sem classe') : 'Sem classe';

    const level = charData.level || 1;
    const profBonus = charData.proficiency_bonus || 2;

    const skillsList = globalSkills?.filter(s => s.type === 'skill') || [];
    const savingThrowsList = globalSkills?.filter(s => s.type === 'saving throw') || [];

    const savingThrowsProfs = {};
    savingThrowsList.forEach(st => {
      const isProficient = charData.char_proficiencies?.some(p => p.skill_id === st.id);
      if (st.ability) {
        savingThrowsProfs[st.ability.toLowerCase()] = isProficient;
      }
    });

    // Calcular Perícias mapeando as globais e verificando proficiências da sheet
    const mappedSkills = skillsList.map(skill => {
      const proficiencyRecord = charData.char_proficiencies?.find(p => p.skill_id === skill.id);
      
      const abilityScore = charData[skill.ability?.toLowerCase()] || 10;
      const abilityMod = Math.floor((abilityScore - 10) / 2);
      
      let totalMod = abilityMod;
      let isProficient = false;
      let isExpertise = false;
      
      if (proficiencyRecord) {
        isProficient = true;
        totalMod += profBonus;
        if (proficiencyRecord.especialization) {
          isExpertise = true;
          totalMod += profBonus;
        }
      }

      return {
        id: skill.id,
        name: skill.name_pt || skill.name,
        ability: skill.ability,
        totalMod: totalMod >= 0 ? `+${totalMod}` : `${totalMod}`,
        isProficient,
        isExpertise
      };
    });

    const characterInfo = {
      id: charData.id,
      name: charData.name || 'Sem Nome',
      race: charData.race?.name_pt || charData.race?.name || 'Desconhecida',
      sub_race: charData.sub_race?.name_pt || charData.sub_race?.name || '',
      class: charClassDetails,
      level: level,
      avatar: charData.avatar_url || null,
      stats: {
        hpCurrent: charData.hit_points || 0,
        hpMax: charData.hit_points_max || 0,
        armorClass: charData.armor_class || 10,
        proficiencyBonus: profBonus,
        speed: charData.speed || 9,
      },
      attributes: {
        str: charData.str,
        dex: charData.dex,
        con: charData.con,
        int: charData.int,
        wis: charData.wis,
        cha: charData.cha
      },
      savingThrows: savingThrowsProfs,
      skills: mappedSkills,
      inventory: {
        coins: {
          gold: 0, silver: 0, copper: 0
        },
        items: []
      },
      magic: {
        spellCastingAbility: '----',
        spellSaveDC: 0,
        spellAttackBonus: 0,
        spells: []
      }
    };

    return { data: characterInfo, error: null };
  } catch (error) {
    console.error("Erro imprevisível:", error);
    return { data: null, error: error.message };
  }
}

export async function updateAvatar(charSheetId, newAvatarUrl) {
  try {
    const { data, error } = await supabase
      .from('char_sheet')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', charSheetId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Erro ao atualizar avatar", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Erro ao atualizar avatar", error);
    return { success: false, error: error.message };
  }
}

export async function uploadAvatarFile(charSheetId, file) {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `public/${charSheetId}-${Math.random()}.${fileExt}`;
    
    // Fazer upload para o bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Pegar URL publica
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Salvar na coluna avatar_url
    return await updateAvatar(charSheetId, data.publicUrl);
  } catch (error) {
    console.error("Erro no upload do arquivo:", error);
    return { success: false, error: error.message };
  }
}

// --- Character Appearance Functions ---

export async function getCharacterAppearance(sheetId) {
  try {
    const { data, error } = await supabase
      .from('char_appearance')
      .select('*')
      .eq('sheet_id', sheetId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar aparência:", error);
      return { data: null, error: error.message };
    }
    return { data: data || {}, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function upsertCharacterAppearance(sheetId, appearanceData) {
  try {
    const payload = { ...appearanceData, sheet_id: sheetId };

    const { data, error } = await supabase
      .from('char_appearance')
      .upsert(payload, { onConflict: 'sheet_id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Erro ao salvar aparência:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --- Auth & Selection Functions ---

export async function signUp(email, password, displayName) {
  return await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: {
        display_name: displayName,
      }
    }
  });
}

export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

/**
 * Envia e-mail de recuperação de senha para o usuário.
 * O link no e-mail redireciona para /reset-password no site.
 */
export async function resetPassword(email) {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://roll-angels.vercel.app/reset-password',
  });
}

/**
 * Atualiza a senha do usuário autenticado (usado na página de reset).
 */
export async function updatePassword(newPassword) {
  return await supabase.auth.updateUser({ password: newPassword });
}

export async function getSession() {
  return await supabase.auth.getSession();
}

export async function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getUserCharacters(userId) {
  try {
    const { data, error } = await supabase
      .from('char_sheet')
      .select(`
        id,
        name,
        level,
        type,
        race(name),
        char_class(level, classes(name))
      `)
      .eq('owner_id', userId);

    if (error) {
      console.error("Erro ao buscar personagens do usuário:", error);
      return { data: null, error: error.message };
    }
    
    const formattedData = data.map(char => {
      const cls = char.char_class && char.char_class.length > 0 
        ? char.char_class[0].classes?.name 
        : 'Desconhecida/Sem Classe';
        
      return {
        ...char,
        className: cls,
        raceName: char.race?.name || 'Desconhecida'
      };
    });

    return { data: formattedData, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// --- Character Creation Requests Functions ---

export async function getClassesList() {
  try {
    const { data, error } = await supabase.from('classes').select('id, name, name_pt, subclass_level, skill_choices_count').order('name', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getSubclassesList(classId) {
  try {
    if (!classId) return { data: [] };
    const { data, error } = await supabase.from('subclasses').select('*').eq('class_id', classId).order('name_pt', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getRacesList() {
  try {
    const { data, error } = await supabase.from('race').select('*').order('name_pt', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getBackgroundsList() {
  try {
    const { data, error } = await supabase.from('background').select('*').order('name', { ascending: true });
    return { data: data || [], error }; 
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getSubRacesList(raceId) {
  try {
    if (!raceId) return { data: [] };
    const { data, error } = await supabase.from('sub_race').select('*').eq('race_id', raceId).order('name_pt', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getSkillsList() {
  try {
    const { data, error } = await supabase.from('savings_skills')
      .select('*')
      .eq('type', 'skill')
      .order('name_pt', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getRaceProficiencies(raceId, subRaceId) {
  try {
    if (!raceId && !subRaceId) return { data: [] };
    
    let query = supabase.from('race_proficiencies').select('*');
    if (raceId && subRaceId) {
      query = query.or(`race_id.eq.${raceId},sub_race_id.eq.${subRaceId}`);
    } else if (raceId) {
      query = query.eq('race_id', raceId);
    } else {
      query = query.eq('sub_race_id', subRaceId);
    }
    
    const { data, error } = await query;
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getClassProficiencies(classId) {
  try {
    if (!classId) return { data: [] };
    const { data, error } = await supabase.from('class_proficiencies')
      .select('skill_id')
      .eq('class_id', classId);
    return { data: data ? data.map(d => d.skill_id) : [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getBackgroundProficiencies(bgId) {
  try {
    if (!bgId) return { data: [] };
    const { data, error } = await supabase.from('background_proficiencies')
      .select('skill_id')
      .eq('background_id', bgId);
    return { data: data ? data.map(d => d.skill_id) : [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function createCharacterRequest(userId, characterData) {
  try {
    const { data, error } = await supabase.from('char_creation_requests').insert([
      { user_id: userId, character_data: characterData, status: 'pending' }
    ]).select();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function getUserPendingRequest(userId) {
  try {
    const { data, error } = await supabase
      .from('char_creation_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function getAllPendingRequests() {
  try {
    const { data, error } = await supabase
      .from('char_creation_requests')
      .select(`
        *,
        auth_users:user_id (email, raw_user_meta_data)
      `)
      .eq('status', 'pending');
    // Obs: O join com auth.users pode precisar de view ou raw_user_meta_data se as policies permitirem,
    // mas o Supabase não deixa dar join direto em auth.users por segurança.
    // Pra simplificar e contornar, se der erro no join, pegamos sem ele.
    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('char_creation_requests')
        .select('*')
        .eq('status', 'pending');
      return { data: fallbackData || [], error: fallbackError };
    }
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function updateRequestStatus(requestId, newStatus) {
  try {
    const { data, error } = await supabase
      .from('char_creation_requests')
      .update({ status: newStatus })
      .eq('id', requestId);
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// --- Full Character Creation Request Functions ---

export async function getUserProfiles() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('display_name', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getSensesLanguagesList() {
  try {
    const { data, error } = await supabase
      .from('senses_languages')
      .select('*')
      .order('name_pt', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getDamageTypesList() {
  try {
    const { data, error } = await supabase
      .from('damage_types')
      .select('*')
      .order('name_pt', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getSavingsSkillsList() {
  try {
    const { data, error } = await supabase
      .from('savings_skills')
      .select('*')
      .order('name_pt', { ascending: true });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function createFullCreationRequest(targetUserId, requestedBy) {
  try {
    const { data, error } = await supabase
      .from('char_full_creation_requests')
      .insert([{ target_user_id: targetUserId, requested_by: requestedBy, status: 'awaiting_user' }])
      .select();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function getUserAwaitingFullRequests(userId) {
  try {
    const { data, error } = await supabase
      .from('char_full_creation_requests')
      .select('*')
      .eq('target_user_id', userId)
      .eq('status', 'awaiting_user');
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function getFullCreationRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from('char_full_creation_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function submitFullCreationRequest(requestId, characterData) {
  try {
    const { data, error } = await supabase
      .from('char_full_creation_requests')
      .update({
        character_data: characterData,
        status: 'pending_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .maybeSingle();
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function getAllPendingFullRequests() {
  try {
    const { data, error } = await supabase
      .from('char_full_creation_requests')
      .select('*')
      .eq('status', 'pending_review')
      .order('updated_at', { ascending: false });
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function updateFullRequestStatus(requestId, newStatus, dmNotes = null) {
  try {
    const update = { status: newStatus, updated_at: new Date().toISOString() };
    if (dmNotes !== null) update.dm_notes = dmNotes;
    const { data, error } = await supabase
      .from('char_full_creation_requests')
      .update(update)
      .eq('id', requestId);
    return { data, error };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Aprova uma solicitação completa e insere registros em todas as tabelas char_*.
 * @param {object} req - O registro completo de char_full_creation_requests
 * @returns {{ success: boolean, error?: string, charSheetId?: number }}
 */
export async function approveFullCreation(req) {
  try {
    const d = req.character_data;

    // 1. char_sheet
    const sheetPayload = {
      name: d.name,
      owner_id: req.target_user_id,
      type: 'character',
      race_id: d.race_id || null,
      sub_race_id: d.sub_race_id || null,
      size: d.size || 'Medium',
      alignment: d.alignment || 'Neutro',
      armor_class: d.armor_class || 10,
      hit_points_max: d.hit_points_max || 10,
      hit_points: d.hit_points || d.hit_points_max || 10,
      speed: d.speed || 9,
      speed_fly: d.speed_fly || null,
      speed_swim: d.speed_swim || null,
      str: d.str || 10,
      dex: d.dex || 10,
      con: d.con || 10,
      int: d.int || 10,
      wis: d.wis || 10,
      cha: d.cha || 10,
      exp: d.exp || 0,
      level: d.level || 1,
      background_id: d.background_id || null,
      passive_perception: d.passive_perception || 10,
      proficiency_bonus: d.proficiency_bonus || 2,
    };

    const { data: newChar, error: charErr } = await supabase
      .from('char_sheet')
      .insert([sheetPayload])
      .select()
      .single();

    if (charErr) return { success: false, error: 'char_sheet: ' + charErr.message };
    const sheetId = newChar.id;

    // 2. char_class
    if (d.class_id) {
      const { error: classErr } = await supabase
        .from('char_class')
        .insert([{
          sheet_id: sheetId,
          class_id: d.class_id,
          subclass_id: d.subclass_id || null,
          level: d.level || 1,
        }]);
      if (classErr) console.error('char_class insert error:', classErr);
    }

    // 3. char_proficiencies
    if (d.proficiencies && d.proficiencies.length > 0) {
      const profRows = d.proficiencies.map(p => ({
        sheet_id: sheetId,
        skill_id: p.skill_id,
        especialization: p.expertise || false,
        source: p.source || null,
      }));
      const { error: profErr } = await supabase.from('char_proficiencies').insert(profRows);
      if (profErr) console.error('char_proficiencies insert error:', profErr);
    }

    // 4. char_senses_languages
    if (d.senses_languages && d.senses_languages.length > 0) {
      const slRows = d.senses_languages.map(id => ({
        sheet_id: sheetId,
        senses_langugages_id: id,
      }));
      const { error: slErr } = await supabase.from('char_senses_languages').insert(slRows);
      if (slErr) console.error('char_senses_languages insert error:', slErr);
    }

    // 5. char_resistance
    if (d.resistances && d.resistances.length > 0) {
      const rRows = d.resistances.map(id => ({
        sheet_id: sheetId,
        damage_id: id,
        active: true,
      }));
      const { error: rErr } = await supabase.from('char_resistance').insert(rRows);
      if (rErr) console.error('char_resistance insert error:', rErr);
    }

    // 6. char_immunity
    if (d.immunities && d.immunities.length > 0) {
      const iRows = d.immunities.map(id => ({
        sheet_id: sheetId,
        damage_id: id,
        active: true,
      }));
      const { error: iErr } = await supabase.from('char_immunity').insert(iRows);
      if (iErr) console.error('char_immunity insert error:', iErr);
    }

    // 7. char_vulnerabilities
    if (d.vulnerabilities && d.vulnerabilities.length > 0) {
      const vRows = d.vulnerabilities.map(id => ({
        sheet_id: sheetId,
        damage_id: id,
        active: true,
      }));
      const { error: vErr } = await supabase.from('char_vulnerabilities').insert(vRows);
      if (vErr) console.error('char_vulnerabilities insert error:', vErr);
    }

    // Atualizar status da solicitação
    await updateFullRequestStatus(req.id, 'approved');

    return { success: true, charSheetId: sheetId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Verifica se o usuário autenticado possui cargo de Mestre (DM).
 */
export async function isCurrentUserDM() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data, error } = await supabase
      .from('user_roles')
      .select('is_dm')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao verificar cargo:", error);
      return false;
    }
    
    return data?.is_dm || false;
  } catch (err) {
    return false;
  }
}
