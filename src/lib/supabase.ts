import { createClient } from "@supabase/supabase-js";

export const DEFAULT_SUPABASE_URL = "https://pllcuqjbaulowcnpwske.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbGN1cWpiYXVsb3djbnB3c2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTEwMzQsImV4cCI6MjEwMTQ4NzAzNH0.HtoZJjkzd87WR1qBwFavciLEqtbX8pZ0Be5Sbq3QRh0";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);