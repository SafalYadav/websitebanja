// src/lib/auth/types.ts

export type AuthProvider = "supabase" | "azure";

export interface AuthenticatedUser {
  id: string; // Persistent PostgreSQL UUID
  email: string | null;
  emailVerified: boolean;
  token: string;
  app_metadata?: Record<string, unknown>;
  provider?: string;
}

export interface AuthValidationResult {
  user: AuthenticatedUser | null;
  status: 200 | 401 | 503;
  error: string | null;
}

export interface AuthSession {
  user: AuthenticatedUser;
  accessToken: string;
  expiresAt?: number;
}
