"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountControl from "../account/AccountControl";
import LanguageSwitcher from "../LanguageSwitcher";
import MobileHeaderMenu from "../MobileHeaderMenu";
import { localizedHref, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { getBrandMessages } from "../../i18n/brandMessages";
import { isActiveNavigationItem } from "../../utils/navigation";
import styles from "./brand.module.css";

export default function BrandHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const copy = getMessages(locale);
  const brand = getBrandMessages(locale);
  return <header className={`${styles.header} ${styles.liveHeader}`}>
    <Link href={localizedHref(locale, "/")} aria-label={`Brawloop · ${copy.common.home}`} className={styles.wordmark}>brawloop<span className={styles.logoDot} /></Link>
    <nav aria-label={copy.common.mainNavigation} className={styles.desktopNav}>
      {[["/", brand.stats], ["/minigames", copy.common.minigames], ["/brawlers", brand.catalog]].map(([path, label]) => <Link key={path} href={localizedHref(locale, path)} className={isActiveNavigationItem(pathname, path) ? styles.activeNav : undefined} aria-current={isActiveNavigationItem(pathname, path) ? "page" : undefined}>{label}</Link>)}
    </nav>
    <div className={styles.liveHeaderActions}>
      <div className={styles.desktopLanguage}><LanguageSwitcher locale={locale} /></div>
      <AccountControl locale={locale} />
      <MobileHeaderMenu locale={locale} allSizes />
    </div>
  </header>;
}
