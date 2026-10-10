"use client";

import { useEffect } from "react";

// Estimates browser tab sessions, NOT unique people. No identifying data is sent.
export function sendUsageEvent(event: "visit_session" | "minigame_brawler_quiz" |
  "minigame_silhouette_quiz" | "minigame_map_quiz" | "minigame_ability_quiz") {
  if (typeof window === "undefined" || document.cookie.includes("brawl_analytics_opt_out=1")) return;
  void fetch("/api/usage/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => { /* Analytics is optional, never interrupt gameplay. */ });
}

export default function UsageSessionTracker() {
  useEffect(() => {
    if (location.pathname.startsWith("/admin/")) return;
    try {
      if (sessionStorage.getItem("brawl_usage_session_v1") === "1") return;
      sessionStorage.setItem("brawl_usage_session_v1", "1");
      sendUsageEvent("visit_session");
    } catch {
      // Storage-denied visitors can still use the site; do not fingerprint them.
    }
  }, []);
  return null;
}
