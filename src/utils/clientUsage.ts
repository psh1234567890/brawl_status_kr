import { isUsageOptedOutCookie } from "./analyticsOptOut";
import type { ClientUsageKind } from "./usageEvents";
import { advanceProductSession, PRODUCT_SESSION_KEY, type ProductAction, type ProductKind } from "./productFunnel";

function productEvents(actions: ProductAction[]): ProductKind[] {
  if (typeof window === "undefined" || isUsageOptedOutCookie(document.cookie)) return [];
  try {
    let raw = localStorage.getItem(PRODUCT_SESSION_KEY);
    const events: ProductKind[] = [];
    for (const action of actions) {
      const result = advanceProductSession(raw, action, Date.now());
      raw = JSON.stringify(result.state);
      events.push(...result.events);
    }
    if (raw !== null && actions.length) localStorage.setItem(PRODUCT_SESSION_KEY, raw);
    return events;
  } catch { return []; /* No storage means no inferred session or conversion. */ }
}

export function trackProductAction(action: ProductAction) {
  postUsageEvents(productEvents([action]));
}

export function sendUsageEvent(event: ClientUsageKind) {
  sendUsageEvents([event]);
}
export function sendUsageEvents(events: ClientUsageKind[]) {
  const actions: ProductAction[] = [];
  for (const event of events) {
    if (event === "page_view") actions.push("view");
    else if (event === "comparison_run") actions.push("compare");
    else if (event === "profile_save") actions.push("save");
    else if (event === "profile_share") actions.push("share");
  }
  postUsageEvents([...events, ...productEvents(actions)]);
}

function postUsageEvents(events: ClientUsageKind[]) {
  if (typeof window === "undefined" || isUsageOptedOutCookie(document.cookie)) return;
  const unique = [...new Set(events)];
  if (!unique.length) return;
  void fetch("/api/usage/event", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(unique.length === 1 ? { event: unique[0] } : { events: unique }), keepalive: true,
  }).catch(() => { /* Optional analytics must never interrupt the user. */ });
}
