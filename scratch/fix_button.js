import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: project } = await supabase.from('projects').select('*').eq('id', 'b0fd3fa2-a266-4239-b5c1-b3e585e8bc61').single();
  if (!project) return console.log("Not found");
  
  let json = project.json_data;
  
  // Set hero button action
  if (json.hero) {
    json.hero.buttonAction = {
      type: 'page',
      target: 'catalog'
    };
  }
  
  // Also add products section to home page if missing
  const homePage = json.pages?.find(p => p.isHome);
  if (homePage && !homePage.sectionOrder.some(s => s.startsWith('products'))) {
    // Insert after hero
    homePage.sectionOrder.splice(1, 0, 'products_1786888719319');
  }
  
  const { error } = await supabase.from('projects').update({ json_data: json }).eq('id', project.id);
  console.log(error || "Updated successfully");
}
run();
