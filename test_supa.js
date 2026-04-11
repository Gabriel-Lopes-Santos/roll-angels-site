import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zpcpcydqutomotjybuge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3BjeWRxdXRvbW90anlidWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjkwNDgsImV4cCI6MjA4MzQwNTA0OH0.yXAdoOu53FjReFna8aLsx79HQtBZ1-tTnL1YxXPG5yQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: userData, error: userError } = await supabase
      .from('users')
      .select('char_sheet_id')
      .eq('disc_id', 1)
      .single();
  console.log("User:", userData, userError);
  
  if (userData?.char_sheet_id) {
    const { data: charData, error: charError } = await supabase
      .from('char_sheet')
      .select(`
        *,
        race(name),
        char_class(level, classes(name))
      `)
      .eq('id', userData.char_sheet_id)
      .single();
    console.log("Char:", charData, charError);
  }
}

test();
