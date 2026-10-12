"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { localizedHref, type Locale } from "../i18n/config";
import { isActiveNavigationItem } from "../utils/navigation";

interface PrimaryNavigationProps {
  locale: Locale;
  ariaLabel: string;
  items: { href: string; label: string }[];
}

export default function PrimaryNavigation({ locale, ariaLabel, items }: PrimaryNavigationProps) {
  const pathname = usePathname();
  const navigationRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const navigation = navigationRef.current;
    const activeLink = activeLinkRef.current;
    if (!navigation || !activeLink || navigation.scrollWidth <= navigation.clientWidth) return;

    // Adjust horizontal scroll without moving the entire document vertically.
    const navRect = navigation.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    navigation.scrollLeft +=
      linkRect.left - navRect.left - (navigation.clientWidth - linkRect.width) / 2;
  }, [pathname]);

  return (
    <nav
      ref={navigationRef}
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      aria-label={ariaLabel}
    >
      {items.map(({ href, label }) => {
        const active = isActiveNavigationItem(pathname, href);
        return (
          <Link
            key={href}
            ref={active ? activeLinkRef : undefined}
            href={localizedHref(locale, href)}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 py-2 text-xs font-black shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-4 sm:text-sm ${
              active
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
