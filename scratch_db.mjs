import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zpcpcydqutomotjybuge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3BjeWRxdXRvbW90anlidWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjkwNDgsImV4cCI6MjA4MzQwNTA0OH0.yXAdoOu53FjReFna8aLsx79HQtBZ1-tTnL1YxXPG5yQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const getCount = async (tableName) => {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`Error counting ${tableName}:`, error.message);
    } else {
      console.log(`Count of ${tableName}:`, count);
    }
  };

  await getCount('class_features');
  await getCount('subclass_features');
  await getCount('char_class');
  await getCount('classes');
}

test();
