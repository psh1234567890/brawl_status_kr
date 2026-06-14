"use client";

import { useMemo, useState } from "react";
import type { ClubSearchResponse } from "../types/brawl";
import BrawlImage from "./BrawlImage";

async function fetchClub(tag: string) {
  const response = await fetch(`/api/club?tag=${encodeURIComponent(tag)}`);
  const data = (await response.json().catch(() => ({}))) as ClubSearchResponse & {
    error?: string;
  };
  if (!response.ok) throw new Error(data.error ?? "클럽 정보를 불러오지 못했습니다.");
  return data;
}

export default function ClubSearch() {
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
      setData(await fetchClub(cleanTag));
    } catch (requestError) {
      setData(null);
      setError(requestError instanceof Error ? requestError.message : "검색에 실패했습니다.");
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
            placeholder="클럽 태그 입력"
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? "검색 중..." : "클럽 검색"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
      </section>

      {data ? (
        <>
          <section className="rounded-lg border border-white bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-black text-indigo-500">{data.club.tag}</p>
              <h2 className="text-3xl font-black text-gray-900">{data.club.name}</h2>
              <p className="text-sm font-medium leading-6 text-gray-500">
                {data.club.description ?? "클럽 설명이 없습니다."}
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Metric label="총 트로피" value={data.club.trophies.toLocaleString("ko-KR")} />
              <Metric label="멤버" value={`${data.members.length}/30`} />
              <Metric label="평균 트로피" value={averageTrophies.toLocaleString("ko-KR")} />
              <Metric label="필요 트로피" value={(data.club.requiredTrophies ?? 0).toLocaleString("ko-KR")} />
            </div>
          </section>

          <section className="rounded-lg border border-white bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-xl font-black text-indigo-950">멤버 목록</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.members.map((member) => (
                <article key={member.tag} className="flex items-center gap-3 rounded-lg bg-indigo-50 p-3">
                  {member.icon?.id ? (
                    <BrawlImage
                      src={`https://cdn.brawlify.com/profile/${member.icon.id}.png`}
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
                      {member.role} · {member.trophies.toLocaleString("ko-KR")} 트로피
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-indigo-50 p-3">
      <p className="text-xs font-black text-indigo-400">{label}</p>
      <p className="mt-1 text-xl font-black text-indigo-900">{value}</p>
    </div>
  );
}
