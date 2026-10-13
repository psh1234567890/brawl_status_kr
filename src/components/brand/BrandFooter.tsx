import Link from "next/link";
import { localizedHref, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import styles from "./brand.module.css";

export default function BrandFooter({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);
  return <footer className={styles.footer}>
    <div><span className={styles.footerBrand}>brawloop.</span><p>{copy.common.fanDisclaimer}{" "}<a href="https://supercell.com/en/fan-content-policy/" target="_blank" rel="noopener noreferrer">Fan Content Policy</a></p></div>
    <nav aria-label={copy.home.siteInfo}>
      {[["/about", copy.home.about], ["/methodology", copy.common.methodology], ["/privacy", copy.common.privacy], ["/terms", copy.home.terms], ["/contact", copy.home.contact]].map(([path, title]) => <Link key={path} href={localizedHref(locale, path)}>{title}</Link>)}
      <a href="https://github.com/psh1234567890/brawl_status_kr" target="_blank" rel="noopener noreferrer">{copy.common.openSource}</a>
    </nav>
  </footer>;
}
