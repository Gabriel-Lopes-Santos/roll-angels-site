import { createClient } from '@supabase/supabase-js';

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
        char_class(level, classes(name)),
        char_proficiencies(skill_id, especialization)
      `)
      .eq('id', charSheetId)
      .maybeSingle();

    if (charError || !charData) {
      console.error("Erro ao buscar ficha.", charError);
      return { data: null, error: "Erro ao buscar ficha do personagem." };
    }

    // Adaptando o char_class
    const charClassDetails = charData.char_class && charData.char_class.length > 0 
      ? charData.char_class[0].classes?.name 
      : 'Sem classe';

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
