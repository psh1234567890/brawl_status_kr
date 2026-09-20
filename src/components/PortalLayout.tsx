import Link from "next/link";
import type { ReactNode } from "react";
import { localizedHref, type Locale } from "../i18n/config";
import { getMessages } from "../i18n/messages";
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-6">
          <nav className="flex flex-wrap gap-2" aria-label={copy.mainNavigation}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={localizedHref(locale, item.href)}
                className="rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-black text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
              >
                {copy[item.key]}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              {eyebrow ? (
                <p className="mb-2 text-sm font-black uppercase text-indigo-500">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="text-3xl font-black text-indigo-950 sm:text-5xl">{title}</h1>
              {description ? (
                <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-gray-600 sm:text-base">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </header>
        <AdSlot />
        {children}
        <footer className="flex flex-col justify-between gap-3 border-t border-indigo-100 py-6 text-xs font-bold text-gray-500 sm:flex-row sm:items-center">
          <p>
            {copy.fanDisclaimer}{" "}
            <a
              href="https://supercell.com/en/fan-content-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-700 hover:underline"
            >
              Fan Content Policy
            </a>
          </p>
          <nav className="flex flex-wrap gap-3" aria-label={copy.projectInfo}>
            <Link href="/methodology" className="hover:text-indigo-700 hover:underline">
              {copy.methodology}
            </Link>
            <Link href="/privacy" className="hover:text-indigo-700 hover:underline">
              {copy.privacy}
            </Link>
            <a
              href="https://github.com/psh1234567890/brawl_status_kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-700 hover:underline"
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
    <div className="rounded-lg border border-white bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-black text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-black text-indigo-700">{value}</p>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-indigo-200 bg-white/70 p-8 text-center text-sm font-bold text-gray-500">
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
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  return null;
}
