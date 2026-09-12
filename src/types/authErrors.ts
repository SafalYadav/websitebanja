// src/types/authErrors.ts

export type AuthErrorType =
  | "AUTH_LOADING"
  | "AUTHENTICATED"
  | "AUTH_UNAUTHENTICATED"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_NETWORK_ERROR"
  | "AUTH_PROVIDER_ERROR"
  | "API_AUTH_ERROR"
  | "API_SERVER_ERROR"
  | "DATABASE_ERROR";

export const AUTH_ERROR_MESSAGES: Record<AuthErrorType, string> = {
  AUTH_LOADING: "Checking your session…",
  AUTHENTICATED: "Session active.",
  AUTH_UNAUTHENTICATED: "You're signed out. Please sign in to continue.",
  AUTH_SESSION_EXPIRED: "Your session expired. Please sign in again.",
  AUTH_NETWORK_ERROR: "Couldn't reach the service. Check your connection and retry.",
  AUTH_PROVIDER_ERROR: "Authentication service is temporarily unavailable. Please try again.",
  API_AUTH_ERROR: "Session could not be verified. Please sign in again.",
  API_SERVER_ERROR: "Something went wrong while loading your workspace.",
  DATABASE_ERROR: "Your workspace data couldn't be loaded. Please retry.",
};

export function classifyAuthError(status: number, message?: string | null): AuthErrorType {
  const msg = (message || "").toLowerCase();

  if (status === 401) {
    if (msg.includes("expired") || msg.includes("jwt expired")) {
      return "AUTH_SESSION_EXPIRED";
    }
    if (msg.includes("missing") || msg.includes("unauthorized") || msg.includes("no bearer")) {
      return "AUTH_UNAUTHENTICATED";
    }
    return "API_AUTH_ERROR";
  }

  if (status === 403) {
    return "API_AUTH_ERROR";
  }

  if (status === 503) {
    if (msg.includes("unreachable") || msg.includes("auth service") || msg.includes("provider")) {
      return "AUTH_PROVIDER_ERROR";
    }
    return "DATABASE_ERROR";
  }

  if (msg.includes("timeout") || msg.includes("connection terminated") || msg.includes("database")) {
    return "DATABASE_ERROR";
  }

  if (msg.includes("network") || msg.includes("fetch failed") || msg.includes("failed to fetch")) {
    return "AUTH_NETWORK_ERROR";
  }

  if (status >= 500) {
    return "API_SERVER_ERROR";
  }

  return "API_SERVER_ERROR";
}
