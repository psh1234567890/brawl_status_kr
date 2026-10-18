// No session IDs: only local timestamps/flags and fixed aggregate event names.
export const PRODUCT_SESSION_KEY = "brawl_product_session_v1";
export const productFields = {
  funnel_session: "sessions", funnel_active: "active", funnel_search: "searches",
  funnel_followup: "followups", funnel_after_meta: "meta", funnel_after_compare: "compare",
  funnel_after_game: "game", funnel_after_save: "save", funnel_after_share: "share",
} as const;
export type ProductKind = keyof typeof productFields;
export const productKinds = Object.keys(productFields) as ProductKind[];
export type ProductCounts = Record<(typeof productFields)[ProductKind], number>;
export type ProductSummary = {
  today: ProductCounts; last7Days: ProductCounts; allTime: ProductCounts;
  trackingStartedAt: string | null;
};
export const emptyProductCounts = (): ProductCounts => ({
  sessions: 0, active: 0, searches: 0, followups: 0, meta: 0, compare: 0, game: 0, save: 0, share: 0,
});
export type ProductAction = "view" | "search" | "meta" | "compare" | "game" | "save" | "share";
type Session = { at: number; search: boolean; active: boolean; followups: number };
const followupActions = {
  meta: [1, "funnel_after_meta"], compare: [2, "funnel_after_compare"],
  game: [4, "funnel_after_game"], save: [8, "funnel_after_save"], share: [16, "funnel_after_share"],
} as const;
const kstDay = (time: number) => Math.floor((time + 9 * 3_600_000) / 86_400_000);

export function advanceProductSession(raw: string | null, action: ProductAction, now: number) {
  let previous: Session | null = null;
  try {
    const value = raw && raw.length <= 256 ? JSON.parse(raw) : null;
    if (value && Object.keys(value).length === 4 && Number.isSafeInteger(value.at) && value.at > 0 &&
        typeof value.search === "boolean" && typeof value.active === "boolean" &&
        Number.isInteger(value.followups) && value.followups >= 0 && value.followups <= 31 &&
        (!value.search || value.active) && (!value.followups || value.search)) previous = value;
  } catch { /* Corrupt optional storage starts a new local session. */ }
  const continued = previous && now >= previous.at && now - previous.at < 30 * 60_000 &&
    kstDay(now) === kstDay(previous.at);
  const state: Session = continued && previous ? { ...previous, at: now } : { at: now, search: false, active: false, followups: 0 };
  const events: ProductKind[] = continued ? [] : ["funnel_session"];
  if (["search", "meta", "compare", "game"].includes(action) && !state.active) {
    state.active = true;
    events.push("funnel_active");
  }
  if (action === "search" && !state.search) {
    state.search = true;
    events.push("funnel_search");
  }
  if (state.search && action in followupActions) {
    const [bit, event] = followupActions[action as keyof typeof followupActions];
    if (!(state.followups & bit)) {
      if (state.followups === 0) events.push("funnel_followup");
      state.followups |= bit;
      events.push(event);
    }
  }
  return { state, events };
}
