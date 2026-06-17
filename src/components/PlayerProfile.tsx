import { rankDict } from "../constants/brawl";
import type { PlayerData } from "../types/brawl";
import { getPlayerIconUrl } from "../utils/brawlAssets";
import BrawlImage from "./BrawlImage";

interface PlayerProfileProps {
  playerData: PlayerData;
  nameColor: string;
  streakCount: number;
  playTime: { hours: number; minutes: number };
}

export default function PlayerProfile({
  playerData,
  nameColor,
  streakCount,
  playTime,
}: PlayerProfileProps) {
  return (
    <section className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {playerData.icon ? (
            <BrawlImage
              src={getPlayerIconUrl(playerData.icon.id)}
              alt="프로필 아이콘"
              width={64}
              height={64}
              className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover sm:h-16 sm:w-16"
              fallbackText="P"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-black text-slate-400 sm:h-16 sm:w-16">
              P
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-normal sm:text-3xl" style={{ color: nameColor }}>
              {playerData.name}
            </h1>
            <p className="mt-1 truncate text-sm font-bold text-slate-500">
              {playerData.club ? `클럽 ${playerData.club.name}` : "소속 클럽 없음"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Badge label="현재 트로피" value={playerData.trophies.toLocaleString("ko-KR")} />
          <Badge label="최고" value={playerData.highestTrophies.toLocaleString("ko-KR")} />
          {streakCount > 0 ? <Badge label="연속 플레이" value={`${streakCount}일`} tone="orange" /> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="예상 플레이" value={`${playTime.hours}시간 ${playTime.minutes}분`} wide />
        <Stat label="경험치 레벨" value={playerData.expLevel} />
        <Stat label="3v3 승리" value={playerData["3vs3Victories"].toLocaleString("ko-KR")} />
        <Stat label="솔로 쇼다운" value={playerData.soloVictories.toLocaleString("ko-KR")} />
        <Stat label="듀오 쇼다운" value={playerData.duoVictories.toLocaleString("ko-KR")} />
        <Stat label="역대 경쟁전" value={formatRank(playerData.highestAllTimeRankedRankName, playerData.highestAllTimeRankedElo)} wide />
        <Stat label="현재 경쟁전" value={formatRank(playerData.rankedRankName, playerData.rankedElo)} wide />
        <Stat label="로보 럼블" value={playerData.bestRoboRumbleTime ?? "-"} />
        <Stat label="빅 브롤러" value={playerData.bestTimeAsBigBrawler ?? "-"} />
        <Stat
          label="챔피언십 예선"
          value={playerData.isQualifiedFromChampionshipChallenge ? "통과" : "미통과"}
        />
      </div>
    </section>
  );
}

function formatRank(rank?: string, elo?: number) {
  return rank ? `${rankDict[rank] ?? rank} (${elo ?? 0})` : "기록 없음";
}

function Badge({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "orange";
}) {
  const toneClass =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <span className={`inline-flex min-h-11 flex-col justify-center rounded-lg border px-3 ${toneClass}`}>
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </span>
  );
}

function Stat({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="truncate text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 truncate text-base font-black text-slate-950">{value}</p>
    </div>
  );
}
