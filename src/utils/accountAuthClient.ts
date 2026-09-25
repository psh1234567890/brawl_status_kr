"use client";

import { publishAccountSessionChange } from "../hooks/useAccount";

export async function startGoogleSignIn(callbackURL: string) {
  const response = await fetch("/api/auth/sign-in/social", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      provider: "google",
      callbackURL,
      errorCallbackURL: callbackURL,
      newUserCallbackURL: callbackURL,
      disableRedirect: true,
    }),
  });
  const payload = await response.json().catch(() => null) as { url?: unknown } | null;
  if (!response.ok || typeof payload?.url !== "string") throw new Error("SIGN_IN_UNAVAILABLE");

  let authorizationURL: URL;
  try {
    authorizationURL = new URL(payload.url);
  } catch {
    throw new Error("SIGN_IN_UNAVAILABLE");
  }
  if (authorizationURL.protocol !== "https:" || authorizationURL.hostname !== "accounts.google.com") {
    throw new Error("SIGN_IN_UNAVAILABLE");
  }
  window.location.assign(authorizationURL.toString());
}

export async function signOutAccount() {
  const response = await fetch("/api/auth/sign-out", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error("SIGN_OUT_FAILED");
  await publishAccountSessionChange();
}
