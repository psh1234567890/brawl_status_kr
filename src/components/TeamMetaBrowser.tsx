"use client";

import { useEffect, useState } from "react";
import { numberLocales, type Locale } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import { translateBrawlerName, translateMapName } from "../utils/brawlTranslations";

type TeamComp = {
  map: string;
  team: string;
  plays: number | string;
  wins: number | string;
  winRate: number | string;
  score: number | string;
};

export default function TeamMetaBrowser({ locale = "ko" }: { locale?: Locale }) {
  const copy = getMessages(locale);
  const [mapName, setMapName] = useState("");
  const [items, setItems] = useState<TeamComp[]>([]);
  const [maps, setMaps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (mapName) params.set("map", mapName);
    fetch(`/api/meta/teams?${params}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          items?: TeamComp[];
          maps?: string[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(locale === "ko" ? data.error ?? copy.teams.error : copy.teams.error);
        }
        if (alive) {
          setItems(data.items ?? []);
          setMaps(data.maps ?? []);
        }
      })
      .catch((requestError) => {
        if (alive) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : copy.teams.error);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [copy.teams.error, locale, mapName]);

  function selectMap(value: string) {
    setLoading(true);
    setError("");
    setMapName(value);
  }

  const sortedMaps = [...new Set(maps)].sort((left, right) =>
    translateMapName(left, locale).localeCompare(
      translateMapName(right, locale),
      numberLocales[locale],
    ),
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="team-meta-map" className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-blue-600">
          {copy.teams.mapSelect}
        </label>
        <select
          id="team-meta-map"
          value={mapName}
          onChange={(event) => selectMap(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:max-w-sm"
        >
          <option value="">{copy.teams.allMaps}</option>
          {sortedMaps.map((map) => (
            <option key={map} value={map}>{translateMapName(map, locale)}</option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-lg font-black text-blue-600 shadow-sm">
          {copy.teams.loading}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg border-l-4 border-red-500 bg-red-100 p-5 font-bold text-red-700">
          {error}
        </div>
      ) : items.length ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <article key={`${item.map}-${item.team}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-blue-600">{translateMapName(item.map, locale)}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{translateTeamName(item.team, locale)}</h2>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Metric label={copy.common.recommendationScore} value={String(item.score)} />
                <Metric label={copy.common.winRate} value={`${item.winRate}%`} />
                <Metric label={copy.common.sample} value={String(item.plays)} />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
          {copy.teams.empty}
        </div>
      )}
    </div>
  );
}

function translateTeamName(team: string, locale: Locale) {
  return team.split(" + ").map((name) => translateBrawlerName(name, locale)).join(" + ");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-blue-50 p-3">
      <p className="text-xs font-black text-blue-500">{label}</p>
      <p className="mt-1 font-black text-blue-950">{value}</p>
    </div>
  );
}
