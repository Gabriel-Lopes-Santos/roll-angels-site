import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zpcpcydqutomotjybuge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3BjeWRxdXRvbW90anlidWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjkwNDgsImV4cCI6MjA4MzQwNTA0OH0.yXAdoOu53FjReFna8aLsx79HQtBZ1-tTnL1YxXPG5yQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const bg = await supabase.from('backgrounds').select('*').limit(1);
  console.log("Backgrounds (pt1):", bg);
  
  const bg2 = await supabase.from('background').select('*').limit(1);
  console.log("Background (pt2):", bg2);
}

test();
