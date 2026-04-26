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
        char_class(level, class_id, subclass_id, classes(id, name, name_pt, subclass_level), subclasses(id, class_id, name, name_pt, description)),
        char_proficiencies(skill_id, especialization),
        background(name, name_pt)
      `)
      .eq('id', charSheetId)
      .maybeSingle();

    if (charError || !charData) {
      console.error("Erro ao buscar ficha.", charError);
      return { data: null, error: "Erro ao buscar ficha do personagem." };
    }

    // Adaptando o char_class
    const charClassEntry = charData.char_class?.[0] || null;
    const cls = charClassEntry?.classes;
    const charClassDetails =
      cls ? (cls.name_pt || cls.name || 'Sem classe') : 'Sem classe';
    const currentSubclass = charClassEntry?.subclasses || null;

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

    const classId = charClassEntry?.class_id || null;
    const subclassId = charClassEntry?.subclass_id || null;

    const normalizeFeature = (feature, source, relatedSubclass = null) => {
      const numericKeys = [
        'level',
        'level_required',
        'required_level',
        'unlock_level',
        'feature_level',
        'class_level',
        'character_level',
        'level_requirement',
        'min_level',
        'obtained_level',
        'available_level',
        'level_req',
        'lvl',
        'tier',
        'rank',
      ];

      const textKeys = [
        'description',
        'summary',
        'details',
        'detail',
        'text',
        'body',
        'content',
        'effect',
        'effects',
        'notes',
        'feature_text',
      ];

      const coerceNumber = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
          const parsed = Number.parseInt(value, 10);
          if (Number.isFinite(parsed)) return parsed;
        }
        return null;
      };

      const featureLevel = numericKeys
        .map((key) => coerceNumber(feature?.[key]))
        .find((value) => value !== null);

      const description = textKeys
        .map((key) => feature?.[key])
        .find((value) => typeof value === 'string' && value.trim());

      return {
        id: `${source}-${feature.id ?? feature.name_pt ?? feature.name ?? Math.random()}`,
        name: feature?.name_pt || feature?.name || 'Caracteristica sem nome',
        description: description || '',
        level: featureLevel,
        source,
        subclassId: relatedSubclass?.id || null,
        subclassName: relatedSubclass?.name_pt || relatedSubclass?.name || null,
      };
    };

    const [classFeaturesRes, subclassesRes] = await Promise.all([
      classId
        ? supabase.from('class_features').select('*').eq('class_id', classId)
        : Promise.resolve({ data: [], error: null }),
      classId
        ? supabase.from('subclasses').select('*').eq('class_id', classId).order('name_pt', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const availableSubclasses = subclassesRes?.data || [];
    const subclassIds = availableSubclasses.map((subclass) => subclass.id).filter(Boolean);

    const { data: subclassFeaturesRaw } = subclassIds.length > 0
      ? await supabase.from('subclass_features').select('*').in('subclass_id', subclassIds)
      : { data: [] };

    const subclassLookup = new Map(availableSubclasses.map((subclass) => [subclass.id, subclass]));
    const classFeatures = (classFeaturesRes?.data || []).map((feature) => normalizeFeature(feature, 'class'));
    const subclassFeatures = (subclassFeaturesRaw || []).map((feature) =>
      normalizeFeature(feature, 'subclass', subclassLookup.get(feature.subclass_id))
    );

    const characterInfo = {
      id: charData.id,
      name: charData.name || 'Sem Nome',
      race: charData.race?.name_pt || charData.race?.name || 'Desconhecida',
      sub_race: charData.sub_race?.name_pt || charData.sub_race?.name || '',
      class: charClassDetails,
      level: level,
      alignment: charData.alignment || 'Neutro',
      background: charData.background?.name_pt || charData.background?.name || 'Desconhecido',
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
      },
      classProgression: {
        classId,
        className: charClassDetails,
        classLevel: charClassEntry?.level || level,
        subclassId,
        subclassName: currentSubclass?.name_pt || currentSubclass?.name || '',
        subclassDescription: currentSubclass?.description || '',
        subclassUnlockLevel: cls?.subclass_level || null,
        currentLevel: level,
        classFeatures,
        subclasses: availableSubclasses.map((subclass) => ({
          id: subclass.id,
          name: subclass.name_pt || subclass.name || 'Subclasse',
          description: subclass.description || '',
          isSelected: subclass.id === subclassId,
          features: subclassFeatures.filter((feature) => feature.subclassId === subclass.id),
        })),
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
        avatar_url,
        race(name, name_pt),
        char_class(level, classes(name, name_pt))
      `)
      .eq('owner_id', userId);

    if (error) {
      console.error("Erro ao buscar personagens do usuário:", error);
      return { data: null, error: error.message };
    }

    const formattedData = data.map(char => {
      const cls = char.char_class && char.char_class.length > 0
        ? (char.char_class[0].classes?.name_pt || char.char_class[0].classes?.name)
        : 'Desconhecida/Sem Classe';

      return {
        ...char,
        className: cls,
        raceName: char.race?.name_pt || char.race?.name || 'Desconhecida'
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

// =====================================================================
// GRIMÓRIO — Funções de Magias do Personagem
// =====================================================================

/**
 * Mapeamento Classe → Habilidade de Conjuração
 */
const SPELLCASTING_ABILITY_MAP = {
  bard: 'cha',
  cleric: 'wis',
  druid: 'wis',
  paladin: 'cha',
  ranger: 'wis',
  sorcerer: 'cha',
  warlock: 'cha',
  wizard: 'int',
  artificer: 'int',
};

/**
 * Mapeamento: tipo de conjuração → precisa preparar?
 * - known: conhece magias fixas, não prepara (Bardo, Feiticeiro, Patrulheiro, Bruxo)
 * - prepared: conhece TODAS da classe, prepara subconjunto (Clérigo, Druida, Paladino, Artificer)
 * - spellbook: copia magias, prepara subconjunto (Mago)
 */
const NEEDS_PREPARATION = {
  known: false,
  prepared: true,
  spellbook: true,
  pact: false,     // Warlock
  half: false,      // Ranger — known-style
  half_up: true,    // Artificer — prepared-style
  full: null,       // Depende da classe específica
};

/**
 * Classes que usam sistema "known" (aprendem magias fixas, não preparam)
 */
const KNOWN_CASTER_CLASSES = ['bard', 'sorcerer', 'ranger', 'warlock'];

/**
 * Classes que usam sistema "prepared" (conhecem todas, preparam subconjunto)
 */
const PREPARED_CASTER_CLASSES = ['cleric', 'druid', 'paladin', 'artificer'];

/**
 * Retorna informações de conjuração do personagem.
 */
export async function getSpellcastingInfo(sheetId) {
  try {
    // Buscar ficha + classe
    const { data: sheet, error: sheetErr } = await supabase
      .from('char_sheet')
      .select(`
        id, level, proficiency_bonus,
        str, dex, con, int, wis, cha,
        char_class(level, class_id, classes(name, name_pt, spellcasting_type, primary_ability))
      `)
      .eq('id', sheetId)
      .maybeSingle();

    if (sheetErr || !sheet) return { data: null, error: sheetErr?.message || 'Ficha não encontrada' };

    const charClass = sheet.char_class?.[0];
    const classInfo = charClass?.classes;

    if (!classInfo || !classInfo.spellcasting_type) {
      return {
        data: {
          isCaster: false,
          className: classInfo?.name_pt || classInfo?.name || 'Desconhecida',
          classNameEn: classInfo?.name || '',
        },
        error: null,
      };
    }

    const classNameEn = classInfo.name;
    const spellcastingAbilityKey = SPELLCASTING_ABILITY_MAP[classNameEn] || 'int';
    const abilityScore = sheet[spellcastingAbilityKey] || 10;
    const abilityMod = Math.floor((abilityScore - 10) / 2);
    const profBonus = sheet.proficiency_bonus || 2;
    const spellSaveDC = 8 + profBonus + abilityMod;
    const spellAttackBonus = profBonus + abilityMod;

    // Determinar tipo de preparo
    const spellcastingType = classInfo.spellcasting_type;
    let needsPreparation;
    if (KNOWN_CASTER_CLASSES.includes(classNameEn)) {
      needsPreparation = false;
    } else if (PREPARED_CASTER_CLASSES.includes(classNameEn) || classNameEn === 'wizard') {
      needsPreparation = true;
    } else {
      needsPreparation = NEEDS_PREPARATION[spellcastingType] ?? false;
    }

    // Calcular nível de conjurador para slots
    const classLevel = charClass.level || sheet.level || 1;
    let casterLevel;
    if (spellcastingType === 'full') {
      casterLevel = classLevel;
    } else if (spellcastingType === 'half' || spellcastingType === 'half_up') {
      casterLevel = Math.max(1, Math.floor(classLevel / 2));
    } else if (spellcastingType === 'pact') {
      casterLevel = 0; // Warlock usa pact slots separados
    } else {
      casterLevel = Math.max(1, Math.floor(classLevel / 3));
    }

    // Buscar slots
    let slots = {};
    if (spellcastingType === 'pact') {
      const { data: pactData } = await supabase
        .from('warlock_pact_slots')
        .select('*')
        .eq('warlock_level', classLevel)
        .maybeSingle();
      if (pactData) {
        slots = { pactSlots: pactData.pact_slots, pactSlotLevel: pactData.pact_slot_level };
      }
    } else if (casterLevel > 0) {
      const { data: slotData } = await supabase
        .from('spellcasting_slots')
        .select('*')
        .eq('caster_level', casterLevel)
        .maybeSingle();
      if (slotData) {
        slots = {};
        for (let i = 1; i <= 9; i++) {
          const v = slotData[`slot_${i}`];
          if (v > 0) slots[i] = v;
        }
      }
    }

    // Máximo de magias preparáveis
    let maxPrepared = 0;
    if (needsPreparation) {
      if (classNameEn === 'wizard') {
        maxPrepared = Math.max(1, abilityMod + classLevel);
      } else if (classNameEn === 'paladin') {
        maxPrepared = Math.max(1, abilityMod + Math.floor(classLevel / 2));
      } else {
        // Clérigo, Druida, Artificer
        maxPrepared = Math.max(1, abilityMod + classLevel);
      }
    }

    const ABILITY_LABELS = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };

    return {
      data: {
        isCaster: true,
        className: classInfo.name_pt || classInfo.name,
        classNameEn,
        classId: charClass.class_id,
        spellcastingType,
        needsPreparation,
        spellcastingAbility: ABILITY_LABELS[spellcastingAbilityKey] || 'INT',
        spellSaveDC,
        spellAttackBonus,
        slots,
        classLevel,
        casterLevel,
        maxPrepared,
      },
      error: null,
    };
  } catch (err) {
    console.error('Erro ao buscar info de conjuração:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Busca o grimório completo do personagem: cantrips, magias conhecidas e preparadas.
 * Para classes prepared, auto-popula char_spells_known na primeira carga.
 */
export async function getCharacterGrimoire(sheetId, spellcastingInfo) {
  try {
    if (!spellcastingInfo?.isCaster) {
      return { cantrips: [], knownSpells: [], preparedSpellIds: new Set(), error: null };
    }

    // 1. Buscar cantrips
    const { data: cantripLinks } = await supabase
      .from('char_cantrips')
      .select('spell_id, source, spells(*)')
      .eq('sheet_id', sheetId);

    const cantrips = (cantripLinks || []).map(c => ({ ...c.spells, source: c.source }));

    // 2. Buscar magias conhecidas
    let { data: knownLinks } = await supabase
      .from('char_spells_known')
      .select('spell_id, source, spells(*)')
      .eq('sheet_id', sheetId);

    // 3. (Removido: o populamento manual será feito por um botão)


    const knownSpells = (knownLinks || []).map(k => ({ ...k.spells, source: k.source }));

    // 4. Buscar magias preparadas (IDs)
    const { data: preparedLinks } = await supabase
      .from('char_spells')
      .select('spell_id')
      .eq('sheet_id', sheetId);

    const preparedSpellIds = new Set((preparedLinks || []).map(p => p.spell_id));

    return { cantrips, knownSpells, preparedSpellIds, error: null };
  } catch (err) {
    console.error('Erro ao buscar grimório:', err);
    return { cantrips: [], knownSpells: [], preparedSpellIds: new Set(), error: err.message };
  }
}

/**
 * Prepara ou desprepara uma magia.
 */
export async function toggleSpellPrepared(sheetId, spellId, shouldPrepare) {
  try {
    if (shouldPrepare) {
      const { error } = await supabase
        .from('char_spells')
        .insert({ sheet_id: sheetId, spell_id: spellId });
      if (error && error.code !== '23505') throw error; // 23505 = unique violation (já existe)
    } else {
      const { error } = await supabase
        .from('char_spells')
        .delete()
        .eq('sheet_id', sheetId)
        .eq('spell_id', spellId);
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    console.error('Erro ao alterar preparo de magia:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Adiciona um cantrip ao personagem.
 */
export async function addCantrip(sheetId, spellId, source = 'class') {
  try {
    const { error } = await supabase
      .from('char_cantrips')
      .insert({ sheet_id: sheetId, spell_id: spellId, source });
    if (error && error.code !== '23505') throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Remove um cantrip do personagem.
 */
export async function removeCantrip(sheetId, spellId) {
  try {
    const { error } = await supabase
      .from('char_cantrips')
      .delete()
      .eq('sheet_id', sheetId)
      .eq('spell_id', spellId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Adiciona uma magia conhecida ao personagem.
 */
export async function addSpellKnown(sheetId, spellId, source = 'class') {
  try {
    const { error } = await supabase
      .from('char_spells_known')
      .insert({ sheet_id: sheetId, spell_id: spellId, source });
    if (error && error.code !== '23505') throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Remove uma magia conhecida do personagem.
 */
export async function removeSpellKnown(sheetId, spellId) {
  try {
    // Remover também de preparadas se estiver lá
    await supabase.from('char_spells').delete().eq('sheet_id', sheetId).eq('spell_id', spellId);
    const { error } = await supabase
      .from('char_spells_known')
      .delete()
      .eq('sheet_id', sheetId)
      .eq('spell_id', spellId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Retorna os espaços de magia utilizados de um personagem.
 * Retorna { used_slots: {}, used_pact_slots: 0 } caso não exista registro.
 */
export async function getCharSpellSlotsUsed(sheetId) {
  try {
    const { data, error } = await supabase
      .from('char_spell_slots_used')
      .select('used_slots, used_pact_slots')
      .eq('sheet_id', sheetId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar slots utilizados:', error);
      return { used_slots: {}, used_pact_slots: 0 };
    }
    return {
      used_slots: data?.used_slots ?? {},
      used_pact_slots: data?.used_pact_slots ?? 0,
    };
  } catch (err) {
    return { used_slots: {}, used_pact_slots: 0 };
  }
}

/**
 * Persiste os espaços de magia utilizados de um personagem (upsert).
 * @param {number} sheetId
 * @param {object} usedSlots     - ex: { "1": 2, "2": 1 }
 * @param {number} usedPactSlots
 */
export async function saveCharSpellSlotsUsed(sheetId, usedSlots, usedPactSlots) {
  try {
    const { error } = await supabase
      .from('char_spell_slots_used')
      .upsert(
        {
          sheet_id: sheetId,
          used_slots: usedSlots,
          used_pact_slots: usedPactSlots,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'sheet_id' }
      );

    if (error) {
      console.error('Erro ao salvar slots utilizados:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Puxa todas as magias de uma classe (círculo 1 a maxSpellLevel) e insere na aba de conhecidas.
 * @param {number} sheetId 
 * @param {number} classId 
 * @param {number} maxSpellLevel 
 */
export async function autoPopulateClassSpells(sheetId, classId, maxSpellLevel) {
  console.log('[autoPopulate] Iniciando...', { sheetId, classId, maxSpellLevel });
  try {
    if (maxSpellLevel <= 0) {
      console.warn('[autoPopulate] maxSpellLevel <= 0, abortando.');
      return { success: false, error: 'O nível máximo de magias (slots) para essa classe é 0. O limite precisa ser calculado corretamente.' };
    }

    // 1. Buscar magias da classe
    console.log('[autoPopulate] Buscando magias da classe ID:', classId);
    const { data: classSpells, error: spellErr } = await supabase
      .from('class_spells')
      .select('spell_id')
      .eq('class_id', classId);

    if (spellErr) {
      console.error('[autoPopulate] Erro ao buscar class_spells:', spellErr);
      throw spellErr;
    }
    
    if (!classSpells || classSpells.length === 0) {
      console.warn('[autoPopulate] Nenhuma magia encontrada para a classe ID:', classId);
      return { success: false, error: `A tabela class_spells está vazia para a classe ID ${classId}` };
    }

    const spellIds = classSpells.map(cs => cs.spell_id);
    console.log(`[autoPopulate] Encontradas ${spellIds.length} magias vinculadas à classe.`);

    // 2. Filtrar magias por nível (buscando na tabela spells)
    console.log('[autoPopulate] Filtrando magias por nível <=', maxSpellLevel);
    const { data: validSpells, error: validErr } = await supabase
      .from('spells')
      .select('id, level')
      .in('id', spellIds)
      .gte('level', 1)
      .lte('level', maxSpellLevel);

    if (validErr) {
      console.error('[autoPopulate] Erro ao filtrar na tabela spells:', validErr);
      throw validErr;
    }

    if (!validSpells || validSpells.length === 0) {
      console.warn('[autoPopulate] Nenhuma magia de nível apropriado encontrada.');
      return { success: false, error: `A busca na tabela 'spells' não retornou magias de níveis 1 a ${maxSpellLevel} para os IDs fornecidos.` };
    }

    const validSpellIds = validSpells.map(s => s.id);
    console.log(`[autoPopulate] ${validSpellIds.length} magias são elegíveis para o nível do personagem.`);

    // 3. Verificar o que já existe
    const { data: knownLinks, error: knownErr } = await supabase
      .from('char_spells_known')
      .select('spell_id')
      .eq('sheet_id', sheetId);

    if (knownErr) {
      console.error('[autoPopulate] Erro ao buscar magias já conhecidas:', knownErr);
      throw knownErr;
    }

    const currentKnownIds = new Set((knownLinks || []).map(k => k.spell_id));
    console.log(`[autoPopulate] O personagem já conhece ${currentKnownIds.size} magias.`);

    // 4. Montar inserção
    const spellsToInsert = validSpellIds
      .filter(id => !currentKnownIds.has(id))
      .map(id => ({
        sheet_id: sheetId,
        spell_id: id,
        source: 'class',
      }));

    console.log(`[autoPopulate] Preparado para inserir ${spellsToInsert.length} novas magias.`);

    if (spellsToInsert.length === 0) {
      return { success: false, error: 'Todas as magias elegíveis da sua classe já constam no seu grimório.' };
    }

    // 5. Executar Insert
    const { error: insertErr } = await supabase.from('char_spells_known').insert(spellsToInsert);
    if (insertErr) {
      console.error('[autoPopulate] Erro no INSERT final:', insertErr);
      throw insertErr;
    }

    console.log('[autoPopulate] Sucesso total!');
    return { success: true };
  } catch (err) {
    console.error('[autoPopulate] Erro Fatal:', err);
    return { success: false, error: err.message };
  }
}
