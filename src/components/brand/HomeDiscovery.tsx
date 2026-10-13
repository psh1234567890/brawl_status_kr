import Image from "next/image";
import Link from "next/link";
import { localizedHref, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { compareNavLabels } from "../../i18n/playerComparisonMessages";
import { getBrandMessages } from "../../i18n/brandMessages";
import StatSymbol from "../StatSymbol";
import { BrandArrow, BrandCharacter } from "./BrandArt";
import styles from "./brand.module.css";

export default function HomeDiscovery({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);
  const gameCopy = getMinigameMessages(locale);
  const brand = getBrandMessages(locale);
  return <>
    <section className={styles.playSection} aria-labelledby="home-games-heading">
      <div className={styles.sectionHeader}><h2 id="home-games-heading">{brand.gamesLead}</h2><Link className={styles.textButton} href={localizedHref(locale, "/minigames")}>{copy.common.minigames}<BrandArrow size={17} /></Link></div>
      <div className={styles.playGrid}>
        <Link className={styles.featuredGame} href={localizedHref(locale, "/minigames/brawler-quiz")} aria-label={gameCopy.quizTitle}>
          <div className={styles.featuredCopy}><h3 className={styles.multiline}>{brand.featuredTitle}</h3><p>{brand.featuredBody}</p><span className={styles.lightButton}>{gameCopy.startGame}<BrandArrow /></span></div>
          <div className={styles.featuredArt} aria-hidden="true"><span className={styles.featuredRing} /><BrandCharacter id={16000000} className={styles.featuredShelly} /><BrandCharacter id={16000001} className={styles.featuredColt} /></div>
        </Link>
        {([{ id: "silhouette-quiz", model: 16000023, color: "yellow" }, { id: "higher-lower", model: 16000002, color: "green" }] as const).map(game => <Link key={game.id} className={`${styles.gameCard} ${styles.smallGame}`} href={localizedHref(locale, `/minigames/${game.id}`)}>
          <div className={`${styles.gameArt} ${styles[game.color]}`}><BrandCharacter id={game.model} silhouette={game.id === "silhouette-quiz"} /><span className={game.id === "silhouette-quiz" ? styles.questionArt : styles.vsArt} aria-hidden="true">{game.id === "silhouette-quiz" ? "?" : "VS"}</span></div>
          <div className={styles.gameInfo}><h3>{gameCopy.games[game.id].title}</h3><span className={styles.playCircle}><BrandArrow /></span></div>
        </Link>)}
      </div>
    </section>
    <section className={styles.compareStrip}>
      <div className={styles.compareAvatars} aria-hidden="true"><Image src="https://cdn.brawlify.com/brawlers/borders/16000005.png" width={60} height={60} alt="" /><span>VS</span><Image src="https://cdn.brawlify.com/brawlers/borders/16000023.png" width={60} height={60} alt="" /></div>
      <div><h2>{brand.compareTitle}</h2><p>{brand.compareBody}</p></div>
      <Link className={styles.outlineButton} href={localizedHref(locale, "/compare")}>{compareNavLabels[locale]}<BrandArrow /></Link>
    </section>
    <section className={styles.discovery} aria-labelledby="home-discover-heading"><h2 id="home-discover-heading">{brand.discover}</h2><div className={styles.discoveryLinks}>
      {([["/meta", copy.common.meta, "map"], ["/brawlers", copy.common.brawlers, "players"], ["/skins", copy.common.skins, "skin"]] as const).map(([path, title, icon]) => <Link key={path} href={localizedHref(locale, path)}><StatSymbol kind={icon} size={25} /><h3>{title}</h3><BrandArrow /></Link>)}
    </div></section>
  </>;
}
