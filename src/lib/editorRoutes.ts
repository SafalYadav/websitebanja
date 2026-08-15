export type EditorStep =
  | "branding"
  | "content"
  | "contact"
  | "integrations"
  | "review"
  | "loading"
  | "workspace"
  | "prompt";

export function editorRoute(projectId: string, step?: EditorStep) {
  const base = `/editor/${projectId}`;
  return step ? `${base}/${step}` : base;
}

export function dashboardRoute() {
  return "/dashboard";
}

export function loginRoute() {
  return "/login";
}

export function signupRoute() {
  return "/signup";
}

export function forgotPasswordRoute() {
  return "/forgot-password";
}

export function resetPasswordRoute() {
  return "/reset-password";
}

export function homeRoute() {
  return "/";
}
