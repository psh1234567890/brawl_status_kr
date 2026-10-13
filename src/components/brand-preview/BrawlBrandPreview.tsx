"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { isValidPlayerTag, normalizePlayerTag } from "../../utils/playerTag";
import styles from "../brand/brand.module.css";

type Language = "ko" | "en";
type View = "home" | "profile" | "games";
type IconName = "search" | "arrow" | "star" | "game" | "book" | "person" | "menu" | "close" | "check" | "trophy";
const names = ["Brawloop", "Brawvio"] as const;
const site = "https://www.brawl-o1.site";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    arrow: <><path d="M4 12h15M13 5l7 7-7 7" /></>,
    star: <path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9Z" />,
    game: <><path d="M8 7h8c3 0 5 10 3 11-2 1-4-3-5-3h-4c-1 0-3 4-5 3C3 17 5 7 8 7Z" /><path d="M8 9v5m-2.5-2.5h5M16 10h.1M18 13h.1" /></>,
    book: <><path d="M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v14c-4-1-7 0-9 2-2-2-5-3-9-2Z" /></>,
    person: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m5 5 14 14M19 5 5 19" />,
    check: <path d="m4 12 5 5L20 6" />,
    trophy: <><path d="M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v2a5 5 0 0 0 5 5M17 5h4v2a5 5 0 0 1-5 5M12 14v6M8 21h8" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Character({ id, className = "", silhouette = false, eager = false }: { id: number; className?: string; silhouette?: boolean; eager?: boolean }) {
  return <Image src={`https://cdn.brawlify.com/brawlers/model/${id}.png`} alt="" width={320} height={400} unoptimized loading={eager ? "eager" : "lazy"}
    className={`${styles.character} ${silhouette ? styles.silhouette : ""} ${className}`} />;
}

const copy = {
  ko: {
    preview: "브랜드 미리보기", name: "이름 후보", sample: "예시 전적", original: "현재 사이트", language: "언어",
    stats: "전적", games: "미니게임", catalog: "도감", login: "로그인", menu: "메뉴", close: "닫기",
    hero: <>내 전적,<br />바로 확인.</>, intro: "태그 하나로 전적, 브롤러, 성장 기록까지.", tag: "플레이어 태그", placeholder: "# 플레이어 태그", search: "전적 보기",
    tagHelp: "내 태그는 어디에?", help: "브롤스타즈에서 왼쪽 위 프로필을 눌러요. 이름 아래 #으로 시작하는 코드가 내 태그예요.",
    liveSearch: "실제 전적은 현재 사이트의 새 탭에서 열려요.", invalid: "태그를 확인해 주세요. 예: #9C82J8YPP", account: "내 계정이 아니어도 검색할 수 있어요.",
    homeKicker: "잠깐, 한 판만!", gameTitle: <>몇 명까지<br />기억해?</>, gameBody: "생각나는 브롤러 이름을 쭉 적어 봐요.", play: "이름 맞히기", browse: "게임 모두 보기", moreGames: "이것도 해볼래?",
    compareTitle: "친구랑 나란히.", compareBody: "트로피부터 보유 브롤러까지, 두 계정을 한눈에.", compare: "친구와 비교", discover: "다음 판 준비", maps: "맵별 추천", mapsBody: "이번 맵에는 누가 좋을까?", brawlers: "브롤러 도감", brawlersBody: "능력과 장비를 살펴봐요.", skins: "스킨 둘러보기", skinsBody: "내 브롤러의 다른 모습.",
    note: "Supercell이 승인하거나 후원하는 공식 서비스가 아닙니다.", about: "소개", method: "통계 기준", privacy: "개인정보", contact: "문의", source: "오픈소스",
    gameHeading: "알면 더 재밌지.", gameSubtitle: "기억력, 눈썰미, 브롤 지식. 자신 있는 걸 골라 봐요.", all: "전체", memory: "기억력", observation: "눈썰미", knowledge: "브롤 지식", start: "플레이", questions: "10문제", pool: "브롤러 이름", result: "예시 데이터로 구성한 화면입니다. 실제 플레이어 기록이 아닙니다.",
    player: "샘플 플레이어", saved: "저장됨", save: "저장", savedNotice: "미리보기에서 저장 상태만 변경했어요.", overview: "요약", owned: "보유 브롤러", trophy: "트로피", highest: "최고 트로피", victories: "3대3 승리", roster: "보유 브롤러", change: "지난 조회보다", recent: "최근 전투", record: "최근 5경기", win: "승리", loss: "패배", trophies: "트로피", battle: "브롤 볼", knockout: "녹아웃", gem: "젬 그랩", level: "레벨", full: "최고 레벨만", empty: "아직 이 조건에 맞는 브롤러가 없어요.", back: "검색으로 돌아가기", opponent: "비교할 친구 찾기", progress: "트로피 변화", sampleBadge: "샘플", days: ["10/8", "10/9", "10/10", "10/11", "10/12", "10/13", "10/14"],
  },
  en: {
    preview: "Brand preview", name: "Name idea", sample: "Sample profile", original: "Current site", language: "Language",
    stats: "Stats", games: "Games", catalog: "Brawlers", login: "Log in", menu: "Menu", close: "Close",
    hero: <>Your stats.<br />Right here.</>, intro: "One tag. Your battles, Brawlers and progress.", tag: "Player tag", placeholder: "# Player tag", search: "Find player",
    tagHelp: "Where is my tag?", help: "Open Brawl Stars and tap your profile in the top left. Your tag is the code starting with # below your name.",
    liveSearch: "Live stats open on the current site in a new tab.", invalid: "Check your player tag. For example: #9C82J8YPP", account: "You can look up your friends, too.",
    homeKicker: "Got a minute?", gameTitle: <>Name the<br />Brawlers.</>, gameBody: "How many can you remember?", play: "Start naming", browse: "All games", moreGames: "Try these next",
    compareTitle: "You. Your friend.", compareBody: "Trophies, Brawlers and upgrades. Side by side.", compare: "Compare players", discover: "Ready for the next match?", maps: "Map picks", mapsBody: "Find a Brawler for your next match.", brawlers: "Brawler collection", brawlersBody: "Get to know their moves and gear.", skins: "Browse skins", skinsBody: "A different look for your favorites.",
    note: "An unofficial fan project. Not approved or sponsored by Supercell.", about: "About", method: "Our data", privacy: "Privacy", contact: "Contact", source: "Open source",
    gameHeading: "Know it. Play it.", gameSubtitle: "Memory, a sharp eye, or Brawl knowledge. Pick your thing.", all: "All", memory: "Memory", observation: "Sharp eyes", knowledge: "Brawl knowledge", start: "Play", questions: "10 questions", pool: "Brawler names", result: "This is a sample layout with fictional values, not a real player record.",
    player: "Sample player", saved: "Saved", save: "Save", savedNotice: "Only the preview save state has changed.", overview: "Overview", owned: "Brawlers", trophy: "Trophies", highest: "Highest trophies", victories: "3v3 wins", roster: "Brawlers owned", change: "since last check", recent: "Recent battles", record: "Last 5 battles", win: "Victory", loss: "Defeat", trophies: "trophies", battle: "Brawl Ball", knockout: "Knockout", gem: "Gem Grab", level: "Level", full: "Max level only", empty: "No Brawlers match this filter yet.", back: "Back to search", opponent: "Find a friend to compare", progress: "Trophy progress", sampleBadge: "Sample", days: ["Oct 8", "9", "10", "11", "12", "13", "14"],
  },
} as const;

const games = [
  { path: "brawler-quiz", ko: "브롤러 이름 맞히기", en: "Name the Brawlers", bodyKo: "이름만 떠오르면 정답.", bodyEn: "Every name you can remember.", category: "memory", id: 16000005, color: "purple" },
  { path: "silhouette-quiz", ko: "이 실루엣, 누구?", en: "Who's that Brawler?", bodyKo: "그림자만 보고 맞혀 봐요.", bodyEn: "Recognize them from a shadow.", category: "observation", id: 16000023, color: "yellow" },
  { path: "higher-lower", ko: "누가 더 높을까?", en: "Higher or lower?", bodyKo: "두 브롤러의 능력치 대결.", bodyEn: "Two Brawlers. Pick the bigger stat.", category: "knowledge", id: 16000002, color: "green" },
  { path: "map-quiz", ko: "이 맵 이름은?", en: "Name that map", bodyKo: "익숙한 맵, 이름도 알까?", bodyEn: "You know the map. What is it called?", category: "observation", id: 16000008, color: "coral" },
  { path: "ability-quiz", ko: "이 능력의 주인은?", en: "Whose ability is this?", bodyKo: "가젯과 스타파워의 주인 찾기.", bodyEn: "Match the Gadget or Star Power.", category: "knowledge", id: 16000006, color: "lilac" },
  { path: "release-order", ko: "누가 먼저 왔을까?", en: "Who came first?", bodyKo: "브롤러의 출시 순서를 맞혀요.", bodyEn: "Pick the Brawler released first.", category: "memory", id: 16000000, color: "blue" },
] as const;

const sampleBrawlers = [
  { id: 16000005, name: "Spike", ko: "스파이크", trophies: 920, power: 11 },
  { id: 16000023, name: "Leon", ko: "레온", trophies: 864, power: 11 },
  { id: 16000000, name: "Shelly", ko: "쉘리", trophies: 751, power: 10 },
  { id: 16000001, name: "Colt", ko: "콜트", trophies: 730, power: 11 },
  { id: 16000008, name: "Nita", ko: "니타", trophies: 690, power: 9 },
  { id: 16000006, name: "Barley", ko: "발리", trophies: 628, power: 9 },
];

function GameCard({ game, language, small = false }: { game: (typeof games)[number]; language: Language; small?: boolean }) {
  const c = copy[language];
  const url = site + (language === "en" ? "/en" : "") + "/minigames/" + game.path;
  return <a href={url} target="_blank" rel="noopener noreferrer" className={`${styles.gameCard} ${small ? styles.smallGame : ""}`}>
    <div className={`${styles.gameArt} ${styles[game.color]}`}>
      <Character id={game.id} silhouette={game.path === "silhouette-quiz"} />
      {game.path === "higher-lower" && <span className={styles.vsArt} aria-hidden="true">VS</span>}
      {game.path === "silhouette-quiz" && <span className={styles.questionArt} aria-hidden="true">?</span>}
    </div>
    <div className={styles.gameInfo}>
      <span className={styles.gameCategory}>{c[game.category]}</span>
      <h3>{language === "ko" ? game.ko : game.en}</h3>
      {!small && <p>{language === "ko" ? game.bodyKo : game.bodyEn}</p>}
      <span className={styles.playCircle}><Icon name="arrow" size={18} /></span>
    </div>
  </a>;
}

export default function BrawlBrandPreview() {
  const [name, setName] = useState<(typeof names)[number]>("Brawloop");
  const [language, setLanguage] = useState<Language>("ko");
  const [view, setView] = useState<View>("home");
  const [menu, setMenu] = useState(false);
  const [tag, setTag] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [filter, setFilter] = useState("all");
  const [profileTab, setProfileTab] = useState("overview");
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState(false);
  const [maxOnly, setMaxOnly] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const content = useRef<HTMLElement>(null);
  const c = copy[language];
  const href = (path: string) => site + (language === "en" ? "/en" : "") + path;
  const live = { target: "_blank", rel: "noopener noreferrer" } as const;

  function navigate(next: View) {
    setView(next);
    setMenu(false);
    setSaveMessage(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => content.current?.focus({ preventScroll: true }));
  }

  function search(event: FormEvent) {
    event.preventDefault();
    if (!isValidPlayerTag(tag)) { setInvalid(true); input.current?.focus(); return; }
    setInvalid(false);
    window.open(href("/") + "?tag=" + encodeURIComponent(normalizePlayerTag(tag)), "_blank", "noopener,noreferrer");
  }

  return <div className={styles.page} lang={language}>
    <div className={styles.previewBar}>
      <span className={styles.previewLabel}>{c.preview}</span>
      <label className={styles.namePicker}><span>{c.name}</span><select aria-label={c.name} value={name} onChange={e => setName(e.target.value as (typeof names)[number])}>{names.map(value => <option key={value}>{value}</option>)}</select></label>
      <button type="button" onClick={() => navigate(view === "profile" ? "home" : "profile")}>{view === "profile" ? c.back : c.sample}</button>
      <a href={site} {...live}>{c.original}</a>
    </div>
    <header className={styles.header}>
      <button type="button" className={styles.wordmark} aria-label={`${name} home`} onClick={() => navigate("home")}>{name.toLowerCase()}<span className={styles.logoDot} /></button>
      <nav aria-label={c.menu} className={styles.desktopNav}>
        <button className={view !== "games" ? styles.activeNav : ""} onClick={() => navigate("home")}>{c.stats}</button>
        <button className={view === "games" ? styles.activeNav : ""} onClick={() => navigate("games")}>{c.games}</button>
        <a href={href("/brawlers")} {...live}>{c.catalog}</a>
      </nav>
      <div className={styles.headerActions}>
        <label className={styles.language}><span className={styles.srOnly}>{c.language}</span><select value={language} onChange={e => setLanguage(e.target.value as Language)}><option value="ko">한국어</option><option value="en">English</option></select></label>
        <a className={styles.account} href={href("/account")} {...live}><Icon name="person" size={18} /><span>{c.login}</span></a>
        <button className={styles.mobileMenuButton} aria-label={menu ? c.close : c.menu} aria-expanded={menu} aria-controls="brand-mobile-menu" onClick={() => setMenu(!menu)}><Icon name={menu ? "close" : "menu"} /></button>
      </div>
    </header>
    {menu && <nav id="brand-mobile-menu" className={styles.mobileMenu} aria-label={c.menu}>
      <button onClick={() => navigate("home")}><Icon name="search" />{c.stats}</button><button onClick={() => navigate("games")}><Icon name="game" />{c.games}</button><a href={href("/brawlers")} {...live}><Icon name="book" />{c.catalog}</a><a href={href("/account")} {...live}><Icon name="person" />{c.login}</a>
    </nav>}

    <main ref={content} tabIndex={-1} className={styles.main}>
      {view === "home" && <>
        <section className={styles.searchHero}>
          <div className={styles.heroContent}>
            <h1>{c.hero}</h1><p className={styles.heroIntro}>{c.intro}</p>
            <form className={styles.searchForm} onSubmit={search}>
              <label className={styles.srOnly} htmlFor="brand-player-tag">{c.tag}</label>
              <Icon name="search" size={24} />
              <input ref={input} id="brand-player-tag" value={tag} maxLength={16} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder={c.placeholder} aria-invalid={invalid} aria-describedby={invalid ? "brand-tag-error" : "brand-search-note"} onChange={e => { setTag(e.target.value); setInvalid(false); }} />
              <button type="submit">{c.search}<Icon name="arrow" size={18} /></button>
            </form>
            {invalid && <p id="brand-tag-error" role="alert" className={styles.formError}>{c.invalid}</p>}
            <details className={styles.tagHelp}><summary>{c.tagHelp}</summary><p>{c.help}</p></details>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <span className={styles.heroDisc} /><Character id={16000005} className={styles.heroSpike} eager /><Character id={16000023} className={styles.heroLeon} eager />
            <span className={styles.heroLabel}>LET’S<br />BRAWL!</span>
          </div>
        </section>
        <p id="brand-search-note" className={styles.previewSearchNote}>{c.liveSearch}</p>

        <section className={styles.playSection} aria-labelledby="brand-play-heading">
          <div className={styles.sectionHeader}><h2 id="brand-play-heading">{c.homeKicker}</h2><button className={styles.textButton} onClick={() => navigate("games")}>{c.browse}<Icon name="arrow" size={17} /></button></div>
          <div className={styles.playGrid}>
            <a className={styles.featuredGame} href={href("/minigames/brawler-quiz")} {...live}>
              <div className={styles.featuredCopy}><h3>{c.gameTitle}</h3><p>{c.gameBody}</p><span className={styles.lightButton}>{c.play}<Icon name="arrow" size={18} /></span></div>
              <div className={styles.featuredArt} aria-hidden="true"><span className={styles.featuredRing} /><Character id={16000000} className={styles.featuredShelly} /><Character id={16000001} className={styles.featuredColt} /></div>
            </a>
            <GameCard language={language} game={games[1]} small /><GameCard language={language} game={games[2]} small />
          </div>
        </section>

        <section className={styles.compareStrip}>
          <div className={styles.compareAvatars} aria-hidden="true"><Image src="https://cdn.brawlify.com/brawlers/borders/16000005.png" alt="" width={60} height={60} /><span>VS</span><Image src="https://cdn.brawlify.com/brawlers/borders/16000023.png" alt="" width={60} height={60} /></div>
          <div><h2>{c.compareTitle}</h2><p>{c.compareBody}</p></div>
          <a className={styles.outlineButton} href={href("/compare")} {...live}>{c.compare}<Icon name="arrow" size={18} /></a>
        </section>

        <section className={styles.discovery} aria-labelledby="brand-discover-heading">
          <h2 id="brand-discover-heading">{c.discover}</h2>
          <div className={styles.discoveryLinks}>
            {([["/meta", c.maps, c.mapsBody, "trophy"], ["/brawlers", c.brawlers, c.brawlersBody, "book"], ["/skins", c.skins, c.skinsBody, "star"]] as const).map(([path, title, body, icon]) => <a key={path} href={href(path)} {...live}><Icon name={icon} size={25} /><div><h3>{title}</h3><p>{body}</p></div><Icon name="arrow" size={18} /></a>)}
          </div>
        </section>
      </>}

      {view === "games" && <section className={styles.gamesPage}>
        <div className={styles.pageHeading}><div><h1>{c.gameHeading}</h1><p>{c.gameSubtitle}</p></div><span className={styles.gameHeadingMark} aria-hidden="true"><Icon name="game" size={64} /></span></div>
        <div className={styles.filters} role="group" aria-label={c.games}>
          {(["all", "memory", "observation", "knowledge"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{c[value]}</button>)}
        </div>
        <div className={styles.allGames}>
          {games.filter(game => filter === "all" || game.category === filter).map(game => <GameCard key={game.path} language={language} game={game} />)}
        </div>
        <p className={styles.externalNote}>{language === "ko" ? "플레이를 누르면 현재 서비스의 실제 게임이 새 탭에서 열려요." : "Play opens the real game on the current site in a new tab."}</p>
      </section>}

      {view === "profile" && <section className={styles.profilePage}>
        <p className={styles.sampleNotice}><span>{c.sampleBadge}</span>{c.result}</p>
        <div className={styles.profileHeader}>
          <div className={styles.profileIdentity}><div className={styles.profileAvatar}><Image src="https://cdn.brawlify.com/brawlers/borders/16000005.png" width={92} height={92} alt="" /></div><div><p className={styles.profileTag}>#SAMPLE</p><h1>{c.player}</h1><span className={styles.profileClub}>{name} Club</span></div></div>
          <button className={`${styles.saveButton} ${saved ? styles.saved : ""}`} aria-pressed={saved} onClick={() => { setSaved(!saved); setSaveMessage(true); }}><Icon name={saved ? "check" : "star"} />{saved ? c.saved : c.save}</button>
        </div>
        {saveMessage && <p role="status" className={styles.saveNotice}>{c.savedNotice}</p>}
        <div className={styles.profileStats}>
          <div className={styles.mainStat}><span><Icon name="trophy" size={18} />{c.trophy}</span><strong>24,680</strong><small>+120 <span>{c.change}</span></small></div>
          {[[c.highest, "25,120"], [c.victories, "1,284"], [c.roster, "64"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        <div className={styles.profileTabs} role="tablist" aria-label={c.player}>
          {["overview", "owned"].map(value => <button key={value} id={`brand-tab-${value}`} role="tab" aria-selected={profileTab === value} aria-controls={`brand-panel-${value}`} onClick={() => setProfileTab(value)} onKeyDown={e => { if (["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); const next = value === "overview" ? "owned" : "overview"; setProfileTab(next); document.getElementById(`brand-tab-${next}`)?.focus(); } }} tabIndex={profileTab === value ? 0 : -1}>{value === "overview" ? c.overview : c.owned}</button>)}
        </div>
        {profileTab === "overview" ? <div role="tabpanel" id="brand-panel-overview" aria-labelledby="brand-tab-overview" className={styles.profileColumns}>
          <section className={styles.battleSection}><div className={styles.sectionHeader}><h2>{c.recent}</h2><span>{c.record}</span></div>
            <div className={styles.battleList}>{[{ win: true, mode: c.battle, id: 16000005, amount: "+8" }, { win: true, mode: c.gem, id: 16000023, amount: "+8" }, { win: false, mode: c.knockout, id: 16000001, amount: "−6" }, { win: true, mode: c.battle, id: 16000005, amount: "+8" }, { win: false, mode: c.gem, id: 16000000, amount: "−6" }].map((battle, i) => <div key={i} className={styles.battleRow}><Image src={`https://cdn.brawlify.com/brawlers/borders/${battle.id}.png`} alt="" width={42} height={42} /><strong className={battle.win ? styles.win : styles.loss}>{battle.win ? c.win : c.loss}</strong><span>{battle.mode}</span><b className={battle.win ? styles.win : styles.loss}>{battle.amount}</b><Icon name="trophy" size={15} /></div>)}</div>
          </section>
          <section className={styles.progressSection}><div className={styles.sectionHeader}><h2>{c.progress}</h2><span>{c.sampleBadge}</span></div><strong>+680 <span>{c.trophies}</span></strong>
            <svg className={styles.chart} viewBox="0 0 420 170" role="img" aria-label={language === "ko" ? "예시: 7일 동안 트로피 680 증가" : "Sample: 680 trophies gained over seven days"}><path d="M10 140H410M10 85H410M10 30H410" stroke="#e5e6e8" strokeWidth="1" fill="none" /><path d="M10 143 75 119 140 123 205 85 270 64 335 42 410 19" fill="none" stroke="#5842ce" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /><circle cx="410" cy="19" r="6" fill="#5842ce" /></svg>
            <div className={styles.chartLabels}>{c.days.map(day => <span key={day}>{day}</span>)}</div><a href={href("/compare")} {...live} className={styles.compareText}>{c.opponent}<Icon name="arrow" size={16} /></a>
          </section>
        </div> : <section role="tabpanel" id="brand-panel-owned" aria-labelledby="brand-tab-owned" className={styles.ownedPanel}>
          <label className={styles.checkLabel}><input type="checkbox" checked={maxOnly} onChange={e => setMaxOnly(e.target.checked)} />{c.full}</label>
          <div className={styles.brawlerRoster}>{sampleBrawlers.filter(b => !maxOnly || b.power === 11).map(b => <article key={b.id}><Image src={`https://cdn.brawlify.com/brawlers/borders/${b.id}.png`} alt="" width={64} height={64} /><div><h3>{language === "ko" ? b.ko : b.name}</h3><span>{c.level} {b.power}</span></div><strong><Icon name="trophy" size={16} />{b.trophies}</strong></article>)}</div>
        </section>}
      </section>}
    </main>
    <footer className={styles.footer}><div><span className={styles.footerBrand}>{name.toLowerCase()}.</span><p>{c.note}</p></div><nav aria-label={c.about}>{[["/about", c.about], ["/methodology", c.method], ["/privacy", c.privacy], ["/contact", c.contact]].map(([path, label]) => <a href={href(path)} {...live} key={path}>{label}</a>)}<a href="https://github.com/psh1234567890/brawl_status_kr" {...live}>{c.source}</a></nav></footer>
  </div>;
}
