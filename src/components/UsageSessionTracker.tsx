"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isUsageOptedOutCookie } from "../utils/analyticsOptOut";
import { BROWSER_ACTIVITY_KEY, browserSessionEvents, type ClientUsageKind } from "../utils/usageEvents";
import { sendUsageEvents } from "../utils/clientUsage";
export { sendUsageEvent } from "../utils/clientUsage";

// Estimates browser tab sessions, NOT unique people. No identifying data is sent.
export default function UsageSessionTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || /^\/(admin|api)(\/|$)/.test(pathname) || isUsageOptedOutCookie(document.cookie)) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const events: ClientUsageKind[] = ["page_view"];
    try {
      const now = Date.now();
      const sessionEvents = browserSessionEvents(localStorage.getItem(BROWSER_ACTIVITY_KEY), now);
      localStorage.setItem(BROWSER_ACTIVITY_KEY, String(now));
      events.push(...sessionEvents);
    } catch {
      // With blocked local storage, report PV only; do not infer a return visit.
    }
    try {
      if (sessionStorage.getItem("brawl_usage_session_v1") !== "1") {
        sessionStorage.setItem("brawl_usage_session_v1", "1");
        events.push("visit_session");
      }
    } catch {
      // Storage-denied visitors can still use the site; do not fingerprint them.
    }
    sendUsageEvents(events);
  }, [pathname]);
  return null;
}
