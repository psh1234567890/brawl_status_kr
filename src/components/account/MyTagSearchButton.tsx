"use client";

import { useAccount } from "../../hooks/useAccount";
import type { Locale } from "../../i18n/config";
import { accountDashboardMessages } from "../../i18n/accountDashboardMessages";
import { isValidPlayerTag, normalizePlayerTag } from "../../utils/playerTag";

export default function MyTagSearchButton({ locale, loading, onSearch }: {
  locale: Locale; loading: boolean; onSearch: (tag: string) => void;
}) {
  const account = useAccount();
  if (account.status !== "account" || !account.account?.onboardingComplete) return null;
  const tag = normalizePlayerTag(account.account.defaultPlayerTag ?? "");
  if (!isValidPlayerTag(tag)) return null;
  return <button
    type="button"
    disabled={loading}
    onClick={() => onSearch(tag)}
    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
  >
    <span aria-hidden="true">🔎</span>
    {accountDashboardMessages[locale].searchMine} · #{tag}
  </button>;
}
