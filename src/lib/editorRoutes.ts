export type EditorStep =
  | "branding"
  | "content"
  | "contact"
  | "review"
  | "loading";

export function editorRoute(projectId: string, step?: EditorStep) {
  const base = `/editor/${projectId}`;
  return step ? `${base}/${step}` : base;
}
