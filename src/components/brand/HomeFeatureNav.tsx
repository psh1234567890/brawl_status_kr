import Link from "next/link";
import { localizedHref, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { getCommunityMessages } from "../../i18n/communityMessages";
import { compareNavLabels } from "../../i18n/playerComparisonMessages";
import StatSymbol, { type StatSymbolKind } from "../StatSymbol";
import styles from "./brand.module.css";

export default function HomeFeatureNav({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);
  const primary: { href: string; label: string; icon: StatSymbolKind; className?: string }[] = [
    { href: "/meta", label: locale === "ko" ? "브롤러 추천" : copy.common.meta, icon: "map" },
    { href: "/minigames", label: copy.common.minigames, icon: "gamepad" },
    { href: "/compare", label: compareNavLabels[locale], icon: "players" },
  ];
  const secondary: typeof primary = [
    { href: "/community", label: getCommunityMessages(locale).nav, icon: "community", className: styles.featureCommunity },
    { href: "/brawlers", label: copy.common.brawlers, icon: "star" },
    { href: "/skins", label: copy.common.skins, icon: "skin" },
    { href: "/rankings", label: copy.common.rankings, icon: "trophy" },
    { href: "/events", label: copy.common.events, icon: "timer" },
    { href: "/maps", label: copy.common.maps, icon: "map" },
    { href: "/gamemodes", label: copy.common.modes, icon: "modes" },
    { href: "/clubs", label: copy.common.clubs, icon: "shield" },
    { href: "/teams", label: copy.common.teams, icon: "team" },
    { href: "/counters", label: copy.common.counters, icon: "target" },
    { href: "/status", label: copy.common.status, icon: "chart" },
    { href: "/", label: copy.common.home, icon: "search" },
  ];
  const renderLinks = (links: typeof primary) => links.map(({ href, label, icon, className }) => <Link key={href} href={localizedHref(locale, href)} className={className}>
    <span className={styles.featureIcon}><StatSymbol kind={icon} size={24} /></span>
    <span>{label}</span>
  </Link>);
  return <nav className={styles.featureNav} aria-label={copy.home.shortcuts}>
    <div className={styles.featurePrimaryGroup}>{renderLinks(primary)}</div>
    <div className={styles.featureSecondaryGroup}>{renderLinks(secondary)}</div>
  </nav>;
}
