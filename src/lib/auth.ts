import { supabase } from "./supabase";

export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password,
  });
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signInWithGoogle() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/dashboard`,
    },
  });
}

export async function resetPasswordForEmail(email: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
}

export async function updateUserPassword(password: string) {
  return await supabase.auth.updateUser({
    password,
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}