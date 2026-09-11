import type { Project, BackendRequirement, OnboardingMode } from "@/types/project";

/**
 * Pure helper to ensure project metadata (backend_config, backend_requirement, etc.) is seamlessly
 * accessible whether stored in top-level columns or nested within json_data.
 * Safe for both Client and Server execution.
 */
export function hydrateProjectMetadata(proj: Project | null): Project | null {
  if (!proj) return null;
  const jsonData = proj.json_data as Record<string, unknown> | null | undefined;
  if (jsonData && typeof jsonData === "object") {
    if (proj.backend_config === undefined || proj.backend_config === null) {
      proj.backend_config = (jsonData.backend_config as Record<string, unknown>) || null;
    }
    if (!proj.backend_requirement && jsonData.backend_requirement) {
      proj.backend_requirement = jsonData.backend_requirement as BackendRequirement;
    }
    if (!proj.onboarding_mode && jsonData.onboarding_mode) {
      proj.onboarding_mode = jsonData.onboarding_mode as OnboardingMode;
    }
    if (!proj.user_prompt && jsonData.user_prompt) {
      proj.user_prompt = String(jsonData.user_prompt);
    }
    if (!proj.selected_features && jsonData.selected_features) {
      proj.selected_features = jsonData.selected_features as any;
    }
  }
  return proj;
}
