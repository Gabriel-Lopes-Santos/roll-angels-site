import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zpcpcydqutomotjybuge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3BjeWRxdXRvbW90anlidWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjkwNDgsImV4cCI6MjA4MzQwNTA0OH0.yXAdoOu53FjReFna8aLsx79HQtBZ1-tTnL1YxXPG5yQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const raceName = "Humano";
    // This is what is currently running:
    const { data: d1, error: e1 } = await supabase.from('race').select('id').or(`name.eq."${raceName}",name_pt.eq."${raceName}"`);
    console.log("With quotes:", d1, e1);

    // This is without quotes:
    const { data: d2, error: e2 } = await supabase.from('race').select('id').or(`name.eq.${raceName},name_pt.eq.${raceName}`);
    console.log("Without quotes:", d2, e2);
    
    // ilike example
    const { data: d3, error: e3 } = await supabase.from('race').select('id').or(`name.ilike.%${raceName}%,name_pt.ilike.%${raceName}%`);
    console.log("ilike:", d3, e3);
}

run();
