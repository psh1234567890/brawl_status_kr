import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { localizedHref, type Locale } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import AccountControl from "./account/AccountControl";
import AdSenseUnit from "./AdSenseUnit";
import LanguageSwitcher from "./LanguageSwitcher";
import MobileHeaderMenu from "./MobileHeaderMenu";
import { compareNavLabels } from "../i18n/playerComparisonMessages";
import PrimaryNavigation from "./PrimaryNavigation";
import StatSymbol from "./StatSymbol";
import type { StatSymbolKind } from "./StatSymbol";

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
  const messages = getMessages(locale);
  const copy = messages.common;

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-3 py-3 text-slate-950 sm:px-6 sm:py-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:gap-5">
        <header className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-2 py-1 md:flex-wrap md:gap-3 lg:py-2">
            <Link
              href={localizedHref(locale, "/")}
              className="group inline-flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:gap-3"
              aria-label={`Brawl Status KR · ${copy.home}`}
            >
              <Image
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                width={48}
                height={48}
                priority
                unoptimized
                className="h-8 w-8 shrink-0 rounded-xl shadow-sm ring-1 ring-blue-200/70 transition-transform group-hover:scale-105 sm:h-12 sm:w-12"
              />
              <span className="block min-w-0">
                <span className="block truncate text-base font-black tracking-normal text-slate-950 sm:text-2xl">
                  Brawl Status KR
                </span>
                <span className="hidden truncate text-xs font-bold text-slate-500 md:block sm:text-sm">
                  {messages.home.brandSubtitle}
                </span>
              </span>
            </Link>
            <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
              <AccountControl locale={locale} />
              <div className="hidden md:block"><LanguageSwitcher locale={locale} /></div>
              <MobileHeaderMenu locale={locale} />
            </div>
          </div>

          <div className="hidden md:block">
            <PrimaryNavigation
              locale={locale}
              ariaLabel={copy.mainNavigation}
              items={[
                { href: "/", label: copy.home },
                { href: "/compare", label: compareNavLabels[locale] },
                ...navItems.slice(1).map((item) => ({ href: item.href, label: copy[item.key] })),
              ]}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                {eyebrow ? (
                  <p className="mb-1 text-xs font-black uppercase tracking-[0.08em] text-blue-600 sm:mb-2">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
                {description ? (
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-5 text-slate-500 sm:mt-3 sm:text-base sm:font-bold sm:leading-6">
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

export function StatPill({ label, value, icon }: { label: string; value: string | number; icon?: StatSymbolKind }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.06em] text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xl font-black text-blue-700">
        {icon ? <StatSymbol kind={icon} size={19} /> : null}
        {value}
      </p>
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
