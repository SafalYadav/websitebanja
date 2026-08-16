import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('projects').select('id, business_name, json_data').ilike('business_name', '%NR Car%');
  for (const p of data) {
    console.log("PROJECT ID:", p.id, p.business_name);
    console.log("PAGES:", p.json_data?.pages?.length);
  }
}
run();
