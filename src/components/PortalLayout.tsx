import Link from "next/link";
import type { ReactNode } from "react";
import { localizedHref, type Locale } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import AccountControl from "./account/AccountControl";
import AdSenseUnit from "./AdSenseUnit";
import LanguageSwitcher from "./LanguageSwitcher";

interface PortalLayoutProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  locale?: Locale;
}

const navItems = [
  { href: "/", key: "home" },
  { href: "/events", key: "events" },
  { href: "/meta", key: "meta" },
  { href: "/maps", key: "maps" },
  { href: "/gamemodes", key: "modes" },
  { href: "/brawlers", key: "brawlers" },
  { href: "/minigames", key: "minigames" },
  { href: "/skins", key: "skins" },
  { href: "/clubs", key: "clubs" },
  { href: "/rankings", key: "rankings" },
  { href: "/teams", key: "teams" },
  { href: "/counters", key: "counters" },
  { href: "/status", key: "status" },
] as const;

export default function PortalLayout({
  title,
  eyebrow,
  description,
  children,
  actions,
  locale = "ko",
}: PortalLayoutProps) {
  const copy = getMessages(locale).common;

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 py-1 lg:py-2">
            <Link href={localizedHref(locale, "/")} className="min-w-0">
              <span className="block text-lg font-black tracking-normal text-slate-950 sm:text-2xl">
                Brawl Status KR
              </span>
              <span className="block truncate text-xs font-bold text-slate-500 sm:text-sm">
                {copy.home}
              </span>
            </Link>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <AccountControl locale={locale} />
              <LanguageSwitcher locale={locale} />
            </div>
          </div>

          <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label={copy.mainNavigation}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={localizedHref(locale, item.href)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 sm:px-4 sm:text-sm"
              >
                {copy[item.key]}
              </Link>
            ))}
          </nav>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
              {eyebrow ? (
                <p className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-blue-600">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
              {description ? (
                <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-slate-500 sm:text-base">
                  {description}
                </p>
              ) : null}
              </div>
              {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <AdSlot />
        {children}
        <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 py-6 text-xs font-bold text-slate-500 sm:flex-row sm:items-center">
          <p>
            {copy.fanDisclaimer}{" "}
            <a
              href="https://supercell.com/en/fan-content-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-950 hover:underline"
            >
              Fan Content Policy
            </a>
          </p>
          <nav className="flex flex-wrap gap-3" aria-label={copy.projectInfo}>
            <Link href={localizedHref(locale, "/methodology")} className="hover:text-slate-950 hover:underline">
              {copy.methodology}
            </Link>
            <Link href={localizedHref(locale, "/privacy")} className="hover:text-slate-950 hover:underline">
              {copy.privacy}
            </Link>
            <a
              href="https://github.com/psh1234567890/brawl_status_kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-950 hover:underline"
            >
              {copy.openSource}
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

export function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.06em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-blue-700">{value}</p>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

export function AdSlot() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;
  if (clientId && slotId) {
    return (
      <aside>
        <AdSenseUnit clientId={clientId} slotId={slotId} />
      </aside>
    );
  }

  return null;
}
