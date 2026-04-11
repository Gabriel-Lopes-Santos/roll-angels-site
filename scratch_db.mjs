import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zpcpcydqutomotjybuge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3BjeWRxdXRvbW90anlidWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjkwNDgsImV4cCI6MjA4MzQwNTA0OH0.yXAdoOu53FjReFna8aLsx79HQtBZ1-tTnL1YxXPG5yQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const getCols = async (table) => {
    const res = await supabase.from(table).select('*').limit(1);
    if (res.data && res.data.length > 0) return Object.keys(res.data[0]);
    return res.data ? "Empty table" : res.error;
  };
  
  console.log("classes:", await getCols('classes'));
  console.log("race:", await getCols('race'));
  console.log("sub_race:", await getCols('sub_race'));
  console.log("background_proficiencies:", await getCols('background_proficiencies'));
}

test();
