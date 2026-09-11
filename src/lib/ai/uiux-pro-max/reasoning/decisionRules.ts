// src/lib/ai/uiux-pro-max/reasoning/decisionRules.ts

/**
 * Closed, non-executable grammar for UI/UX Pro Max decision rules.
 * Direct TypeScript implementation of reasoning_contract.py.
 */

export const CONDITION_SIGNALS: Record<string, string[]> = {
  if_booking: ["booking", "appointment", "calendar", "reserve", "slot"],
  if_boutique: ["boutique"],
  if_casual: ["casual", "playful"],
  if_checkout: ["checkout", "payment", "purchase", "order"],
  if_children: ["child", "children", "kids"],
  if_collaboration: ["collaboration", "multiplayer", "co-edit"],
  if_competitive: ["competitive", "leaderboard"],
  if_content_focused: ["content", "article", "reading", "documentation", "blog"],
  if_conversion_focused: ["conversion", "sales", "signup", "purchase", "cta"],
  if_creative_field: ["creative", "artist", "portfolio", "design", "studio"],
  if_crop_focused: ["crop", "farm", "agriculture"],
  if_dashboard: ["dashboard", "operations", "monitoring", "admin"],
  if_data_heavy: ["data heavy", "data-heavy", "analytics", "large dataset", "metrics"],
  if_delivery: ["delivery", "courier", "shipping"],
  if_discovery_focused: ["discover", "discovery", "browse", "directory", "catalog"],
  if_engagement_metric: ["engagement", "retention", "contribution"],
  if_experience_focused: ["experience", "immersive", "journey"],
  if_gamification: ["gamification", "badges", "streak"],
  if_health: ["health", "medical", "patient", "clinic", "dental", "doctor"],
  if_hero_needed: ["hero", "showcase", "launch"],
  if_large_dataset: ["large dataset", "thousands", "millions"],
  if_light_mode_needed: ["light mode", "light theme"],
  if_low_performance: ["low performance", "low-end", "slow device"],
  if_luxury: ["luxury", "premium", "high-end", "exclusive"],
  if_medication: ["medication", "medicine", "prescription"],
  if_meditation: ["meditation", "breathing", "mindfulness"],
  if_minimal_portfolio: ["minimal portfolio", "simple portfolio"],
  if_mobile: ["mobile", "phone", "tablet", "ios", "android"],
  if_personalized: ["personalized", "personalised", "recommendation"],
  if_pre_launch: ["pre-launch", "prelaunch", "coming soon", "waitlist"],
  if_salary_focused: ["salary", "compensation", "pay range"],
  if_team_collaboration: ["team collaboration", "team workspace"],
  if_trust_needed: ["trust", "secure", "verified", "authority", "compliance"],
  if_ux_focused: ["ux", "usability", "accessibility", "accessible"],
  if_video_ready: ["video ready", "product video", "demo video"],
};

const CONDITION_PATTERNS = Object.fromEntries(
  Object.entries(CONDITION_SIGNALS).map(([cond, signals]) => [
    cond,
    signals.map(
      (sig) => new RegExp(`(?<!\\w)${sig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w)`, "i")
    ),
  ])
);

export interface DecisionRulesResult {
  activated: Array<{ condition: string; actions: string[] }>;
  styleIds: string[];
  constraints: string[];
  pattern: string | null;
  mode: "dark" | "light" | null;
}

export function parseDecisionRules(rawJson: string): Record<string, string[]> {
  if (!rawJson || rawJson.trim() === "" || rawJson === "{}") return {};
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, string[]>;
  } catch {
    return {};
  }
}

export function applyDecisionRules(
  rules: Record<string, string[]>,
  query: string
): DecisionRulesResult {
  const normalized = String(query || "").toLowerCase();
  const result: DecisionRulesResult = {
    activated: [],
    styleIds: [],
    constraints: [],
    pattern: null,
    mode: null,
  };

  for (const [condition, actions] of Object.entries(rules)) {
    const patterns = CONDITION_PATTERNS[condition] || [];
    const active =
      condition === "must_have" ||
      patterns.some((pattern) => pattern.test(normalized));

    if (!active) continue;

    result.activated.push({ condition, actions: [...actions] });

    for (const action of actions) {
      if (!action.includes(":")) continue;
      const [prefix, value] = action.split(":", 2);

      if (prefix === "style" && !result.styleIds.includes(value)) {
        result.styleIds.push(value);
      } else if (prefix === "constraint" && !result.constraints.includes(value)) {
        result.constraints.push(value);
      } else if (prefix === "pattern") {
        result.pattern = value;
      } else if (prefix === "mode" && (value === "dark" || value === "light")) {
        result.mode = value;
      }
    }
  }

  return result;
}
