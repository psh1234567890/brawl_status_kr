"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { localizedHref, numberLocales, type Locale } from "../../i18n/config";
import { eventRotationMessages } from "../../i18n/eventRotationMessages";
import type { EventRotationResponse, RotationEvent } from "../../types/events";
import { translateMapName, translateModeName } from "../../utils/brawlTranslations";
import GameModeIcon from "../GameModeIcon";
import { BrandArrow } from "./BrandArt";
import styles from "./HomeCurrentMaps.module.css";

function subscribeClock(notify: () => void) {
  const timer = window.setInterval(() => { if (document.visibilityState === "visible") notify(); }, 1_000);
  document.addEventListener("visibilitychange", notify);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", notify);
  };
}
const clockSnapshot = () => Math.floor(Date.now() / 1_000) * 1_000;
const serverClockSnapshot = () => 0;
const MODE_DISPLAY_KEYS: Record<string, string> = { brawlArena: "arena", knockout5V5: "knockout5v5" };

export default function HomeCurrentMaps({ locale, expanded = false }: { locale: Locale; expanded?: boolean }) {
  const copy = eventRotationMessages[locale];
  const now = useSyncExternalStore(subscribeClock, clockSnapshot, serverClockSnapshot);
  const [state, setState] = useState<{ data: EventRotationResponse | null; failed: boolean }>({ data: null, failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let controller: AbortController | null = null;
    let disposed = false;
    async function refresh() {
      if (controller || document.visibilityState === "hidden") return;
      controller = new AbortController();
      try {
        const response = await fetch("/api/events", { signal: controller.signal });
        if (!response.ok) throw new Error("rotation unavailable");
        const data = await response.json() as EventRotationResponse;
        if (!disposed) setState({ data, failed: false });
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) setState({ data: null, failed: true });
      } finally { controller = null; }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [attempt]);

  const data = state.data;
  const tooOld = Boolean(data && now && now - Date.parse(data.fetchedAt) > 300_000);
  const active = data && !tooOld && now
    ? [...data.active, ...data.upcoming].filter(event => Date.parse(event.startTime) <= now && now < Date.parse(event.endTime)) : [];
  const upcoming = data && !tooOld && now ? data.upcoming.filter(event => Date.parse(event.startTime) > now) : [];
  const failed = state.failed || tooOld;
  const loading = !data && !failed;
  const justExpired = Boolean(data?.active.length && !active.length);

  function cards(events: RotationEvent[], future = false) {
    return <div className={expanded ? styles.grid : styles.rail}>
      {events.map(event => {
        const modeKey = MODE_DISPLAY_KEYS[event.mode] ?? event.mode;
        const mode = translateModeName(modeKey, locale);
        const map = translateMapName(event.map, locale);
        const time = remainingTime(Date.parse(event.endTime) - now, locale);
        const href = `${localizedHref(locale, "/meta")}?${new URLSearchParams({ map: event.map, gameMode: event.mode })}`;
        return <Link key={`${event.slotId}-${event.mapId}-${event.startTime}`} href={href} className={styles.card} aria-label={`${mode} · ${map} · ${copy.recommendation}`}>
          <span className={styles.mode}><GameModeIcon mode={translateModeName(modeKey, "en")} size={20} /><span>{mode}</span></span>
          <strong>{map}</strong>
          <span className={styles.bottom}>
            <time dateTime={future ? event.startTime : event.endTime}>
              {future ? new Intl.DateTimeFormat(numberLocales[locale], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(event.startTime)) : copy.endsIn.replace("{time}", time)}
            </time>
          </span>
          <span className={styles.recommendation}><span>{copy.recommendation}</span><BrandArrow size={14} /></span>
        </Link>;
      })}
    </div>;
  }

  return <section className={styles.rotation} aria-label={copy.title} data-testid="current-maps">
    <div className={styles.heading}>
      <h2><span aria-hidden="true" className={styles.liveDot} />{copy.title}</h2>
      {!expanded && <Link href={localizedHref(locale, "/events")}>{copy.allEvents}<BrandArrow size={14} /></Link>}
    </div>
    {active.length ? cards(active) : <div className={styles.message} role="status">
      <span>{failed ? copy.unavailable : loading ? copy.loading : justExpired ? copy.refreshing : copy.empty}</span>
      {failed && <button type="button" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button>}
    </div>}
    {active.length > 0 && !expanded && <p className={styles.hint}>{copy.scrollHint}</p>}
    {expanded && upcoming.length > 0 && <><h2 className={styles.upcoming}>{copy.upcoming}</h2>{cards(upcoming, true)}</>}
  </section>;
}

function remainingTime(milliseconds: number, locale: Locale) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  const hours = Math.floor(minutes / 60);
  const minutePart = minutes % 60;
  const format = (value: number, unit: "hour" | "minute") => new Intl.NumberFormat(numberLocales[locale], { style: "unit", unit, unitDisplay: "narrow" }).format(value);
  return [hours ? format(hours, "hour") : "", minutePart ? format(minutePart, "minute") : ""].filter(Boolean).join(" ");
}
