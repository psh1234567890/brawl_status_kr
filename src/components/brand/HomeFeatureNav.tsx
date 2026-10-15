import Link from "next/link";
import { localizedHref, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { getCommunityMessages } from "../../i18n/communityMessages";
import { compareNavLabels } from "../../i18n/playerComparisonMessages";
import StatSymbol, { type StatSymbolKind } from "../StatSymbol";
import styles from "./brand.module.css";

export default function HomeFeatureNav({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);
  const links: { href: string; label: string; icon: StatSymbolKind; className?: string }[] = [
    { href: "/minigames", label: copy.common.minigames, icon: "battle", className: styles.featureInHeader },
    { href: "/community", label: getCommunityMessages(locale).nav, icon: "shield", className: styles.featureCommunity },
    { href: "/compare", label: compareNavLabels[locale], icon: "players" },
    { href: "/rankings", label: copy.common.rankings, icon: "trophy" },
    { href: "/brawlers", label: copy.common.brawlers, icon: "star", className: styles.featureInHeader },
    { href: "/skins", label: copy.common.skins, icon: "skin" },
    { href: "/meta", label: copy.common.meta, icon: "map" },
    { href: "/events", label: copy.common.events, icon: "timer" },
  ];
  return <nav className={styles.featureNav} aria-label={copy.home.shortcuts}>
    {links.map(({ href, label, icon, className }) => <Link key={href} href={localizedHref(locale, href)} className={className}>
      <span className={styles.featureIcon}><StatSymbol kind={icon} size={24} /></span>
      <span>{label}</span>
    </Link>)}
  </nav>;
}
