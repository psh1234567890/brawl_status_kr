"use client";

import { useMemo, useState } from "react";
import { numberLocales, type Locale } from "../i18n/config";
import { getCatalogPageMessages } from "../i18n/catalogPageMessages";
import type { ClubSearchResponse } from "../types/brawl";
import { getClubBadgeUrl, getPlayerIconUrl } from "../utils/brawlAssets";
import BrawlImage from "./BrawlImage";

async function fetchClub(tag: string, locale: Locale, fallbackError: string) {
  const response = await fetch(`/api/club?tag=${encodeURIComponent(tag)}`);
  const data = (await response.json().catch(() => ({}))) as ClubSearchResponse & {
    error?: string;
  };
  if (!response.ok) throw new Error(locale === "ko" ? data.error ?? fallbackError : fallbackError);
  return data;
}

export default function ClubSearch({ locale = "ko" }: { locale?: Locale }) {
  const copy = getCatalogPageMessages(locale).clubs;
  const [tag, setTag] = useState("");
  const [data, setData] = useState<ClubSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const averageTrophies = useMemo(() => {
    if (!data?.members.length) return 0;
    return Math.floor(
      data.members.reduce((total, member) => total + member.trophies, 0) / data.members.length,
    );
  }, [data]);

  async function handleSearch() {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    setLoading(true);
    setError("");
    try {
      setData(await fetchClub(cleanTag, locale, copy.fetchError));
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof Error ? requestError.message : copy.searchFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-white bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSearch();
            }}
            placeholder={copy.placeholder}
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? copy.searching : copy.search}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
      </section>

      {data ? (
        <>
          <section className="rounded-lg border border-white bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {data.club.badgeId ? (
                <BrawlImage
                  src={getClubBadgeUrl(data.club.badgeId)}
                  alt={`${data.club.name}${copy.badgeAltSuffix}`}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-lg bg-indigo-50 p-2"
                  fallbackText={data.club.name.slice(0, 1)}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-indigo-500">{data.club.tag}</p>
                <h2 className="break-words text-3xl font-black text-gray-900">{data.club.name}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
                  {data.club.description ?? copy.noDescription}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Metric label={copy.totalTrophies} value={data.club.trophies.toLocaleString(numberLocales[locale])} />
              <Metric label={copy.members} value={`${data.members.length}/30`} />
              <Metric label={copy.averageTrophies} value={averageTrophies.toLocaleString(numberLocales[locale])} />
              <Metric label={copy.requiredTrophies} value={(data.club.requiredTrophies ?? 0).toLocaleString(numberLocales[locale])} />
            </div>
          </section>

          <section className="rounded-lg border border-white bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-xl font-black text-indigo-950">{copy.memberList}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.members.map((member) => (
                <article key={member.tag} className="flex items-center gap-3 rounded-lg bg-indigo-50 p-3">
                  {member.icon?.id ? (
                    <BrawlImage
                      src={getPlayerIconUrl(member.icon.id)}
                      alt={member.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-md"
                      fallbackText={member.name.slice(0, 1)}
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white font-black text-indigo-300">
                      {member.name.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-black text-gray-900">{member.name}</p>
                    <p className="text-xs font-bold text-gray-500">
                      {formatClubRole(member.role, locale)} · {member.trophies.toLocaleString(numberLocales[locale])} {copy.trophiesUnit}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function formatClubRole(role: string, locale: Locale) {
  const key = role.toLowerCase().replace(/[^a-z]/g, "");
  const labels: Record<Locale, Record<string, string>> = {
    ko: { president: "회장", vicepresident: "부회장", senior: "장로", member: "멤버" },
    en: { president: "President", vicepresident: "Vice President", senior: "Senior", member: "Member" },
    ja: { president: "リーダー", vicepresident: "サブリーダー", senior: "シニア", member: "メンバー" },
    "pt-br": { president: "Presidente", vicepresident: "Vice-presidente", senior: "Veterano", member: "Membro" },
    es: { president: "Presidente", vicepresident: "Vicepresidente", senior: "Veterano", member: "Miembro" },
    tr: { president: "Başkan", vicepresident: "Başkan Yardımcısı", senior: "Kıdemli", member: "Üye" },
    de: { president: "Präsident", vicepresident: "Vizepräsident", senior: "Senior", member: "Mitglied" },
    fr: { president: "Président", vicepresident: "Vice-président", senior: "Vétéran", member: "Membre" },
    it: { president: "Presidente", vicepresident: "Vicepresidente", senior: "Veterano", member: "Membro" },
    ru: { president: "Президент", vicepresident: "Вице-президент", senior: "Ветеран", member: "Участник" },
  };
  return labels[locale][key] ?? role;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-indigo-50 p-3">
      <p className="text-xs font-black text-indigo-400">{label}</p>
      <p className="mt-1 text-xl font-black text-indigo-900">{value}</p>
    </div>
  );
}
