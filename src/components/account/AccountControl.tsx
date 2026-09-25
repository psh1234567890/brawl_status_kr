"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { localizedHref, type Locale } from "../../i18n/config";
import { getAccountMessages } from "../../i18n/accountMessages";
import { useAccount } from "../../hooks/useAccount";
import { signOutAccount } from "../../utils/accountAuthClient";

export default function AccountControl({ locale }: { locale: Locale }) {
  const copy = getAccountMessages(locale);
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", closeOutside);
    return () => window.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  if (account.status === "disabled") return null;
  if (account.status === "loading") {
    return <span aria-hidden="true" className="h-11 w-20 animate-pulse rounded-lg bg-slate-100" />;
  }
  if (account.status === "error") {
    return (
      <button
        type="button"
        onClick={() => void account.refresh()}
        className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900"
        aria-label={copy.serviceUnavailable}
      >
        {copy.retry}
      </button>
    );
  }
  if (account.status === "guest") {
    return (
      <Link
        href={localizedHref(locale, "/account")}
        className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
      >
        {copy.navLogin}
      </Link>
    );
  }
  if (account.status === "deletionOnly") {
    return (
      <Link
        href={localizedHref(locale, "/account")}
        className="inline-flex min-h-11 items-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-800 shadow-sm"
      >
        {copy.deleteTitle}
      </Link>
    );
  }
  if (!account.account) return null;

  const initial = [...account.account.nickname][0]?.toLocaleUpperCase(locale) ?? "?";
  async function handleSignOut() {
    setSigningOut(true);
    setError("");
    try {
      await signOutAccount();
      setOpen(false);
    } catch {
      setError(copy.signOutFailed);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={copy.menuLabel + ": " + account.account.nickname}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
        className="inline-flex min-h-11 max-w-48 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-blue-300 sm:px-3"
      >
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-800">{initial}</span>
        <span className="max-w-32 truncate">{account.account.nickname}</span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={copy.menuLabel}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              triggerRef.current?.focus();
              return;
            }
            const items = Array.from(
              menuRef.current?.querySelectorAll<HTMLElement>(
                '[role="menuitem"]:not([disabled])',
              ) ?? [],
            );
            if (items.length === 0) return;
            const current = items.indexOf(document.activeElement as HTMLElement);
            let next = -1;
            if (event.key === "ArrowDown") next = (current + 1 + items.length) % items.length;
            if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
            if (event.key === "Home") next = 0;
            if (event.key === "End") next = items.length - 1;
            if (next >= 0) {
              event.preventDefault();
              items[next]?.focus();
            }
          }}
          className="absolute right-0 top-full z-50 mt-2 flex min-w-48 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          <Link
            href={localizedHref(locale, "/account")}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-800 focus:bg-blue-50 focus:outline-none"
          >
            {copy.menuAccount}
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none disabled:opacity-60"
          >
            {signingOut ? copy.signingOut : copy.signOut}
          </button>
          {error ? <p role="status" aria-live="polite" className="px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
