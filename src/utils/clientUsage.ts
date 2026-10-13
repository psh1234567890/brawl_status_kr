import { isUsageOptedOutCookie } from "./analyticsOptOut";
import type { ClientUsageKind } from "./usageEvents";
export function sendUsageEvent(event: ClientUsageKind) {
  sendUsageEvents([event]);
}
export function sendUsageEvents(events: ClientUsageKind[]) {
  if (typeof window === "undefined" || isUsageOptedOutCookie(document.cookie)) return;
  void fetch("/api/usage/event", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(events.length === 1 ? { event: events[0] } : { events }), keepalive: true,
  }).catch(() => { /* Optional analytics must never interrupt the user. */ });
}
