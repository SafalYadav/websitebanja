import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    dotenv.config({ path: ".env" });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.rpc("get_preview_project", { p_preview_id: "00000000-0000-0000-0000-000000000000" });
  console.log(error);
}
check();
