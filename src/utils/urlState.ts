import { useSyncExternalStore } from "react";

export type SearchParamUpdate = Record<string, string | null | undefined>;

const URL_STATE_CHANGED_EVENT = "brawlUrlStateChanged";

export function updateRelativeUrl(
  pathname: string,
  search: string,
  hash: string,
  updates: SearchParamUpdate,
) {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
  }

  const nextSearch = params.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash}`;
}

export function replaceBrowserSearch(updates: SearchParamUpdate) {
  if (typeof window === "undefined") return;
  const nextUrl = updateRelativeUrl(
    window.location.pathname,
    window.location.search,
    window.location.hash,
    updates,
  );
  window.history.replaceState(window.history.state, "", nextUrl);
  window.dispatchEvent(new Event(URL_STATE_CHANGED_EVENT));
}

export function useBrowserSearch() {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("popstate", onStoreChange);
      window.addEventListener(URL_STATE_CHANGED_EVENT, onStoreChange);
      return () => {
        window.removeEventListener("popstate", onStoreChange);
        window.removeEventListener(URL_STATE_CHANGED_EVENT, onStoreChange);
      };
    },
    () => window.location.search,
    () => "",
  );
}
