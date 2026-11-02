import artifactJson from "../data/season55-recommendation.json";
import { legacyMetaScore } from "../utils/metaScore";

type MapStat = { map: string; mode: string; brawler: string; plays: number; wins: number };
type ModelArtifact = {
  version: string; season: number; sourceRevision: string; sourceUrl: string;
  trainingSets: number; allPlayersPower: number; dataStartUtc: string;
  dataEndUtc: string; trainingEndUtc: string; brawlers: string[];
  mapModes: [string, string][]; intercept: number; weights: Record<string, number>;
  mapStats: MapStat[];
  defaultContext: { map: string; mode: string; allies: string[]; opponents: string[] };
};
const artifact = artifactJson as unknown as ModelArtifact;
const knownBrawlers = new Set(artifact.brawlers);
const knownMaps = new Set(artifact.mapModes.map(([map, mode]) => JSON.stringify([map, mode])));
const coefficients = new Map(Object.entries(artifact.weights));
const mapStats = new Map(artifact.mapStats.map((r) => [JSON.stringify([r.map, r.mode, r.brawler]), r]));

export type DraftInput = {
  map: string; mode: string; allies: string[]; opponents: string[];
  banned: string[]; candidates?: string[]; topK: number;
};
export class DraftInputError extends Error {}

function names(value: unknown, field: string, length?: number): string[] {
  if (!Array.isArray(value) || value.length > artifact.brawlers.length ||
      (length !== undefined && value.length !== length) ||
      value.some((v) => typeof v !== "string" || v.length > 40)) {
    throw new DraftInputError(`${field} 입력을 확인해 주세요.`);
  }
  const result = value.map((v: string) => v.trim().toUpperCase());
  if (new Set(result).size !== result.length || result.some((v) => !knownBrawlers.has(v))) {
    throw new DraftInputError(`${field}에 중복되거나 학습 범위에 없는 브롤러가 있습니다.`);
  }
  return result;
}

export function parseDraftInput(raw: unknown): DraftInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new DraftInputError("입력을 확인해 주세요.");
  const r = raw as Record<string, unknown>;
  if (typeof r.map !== "string" || typeof r.mode !== "string" ||
      !knownMaps.has(JSON.stringify([r.map, r.mode]))) {
    throw new DraftInputError("시즌 55 학습 범위의 맵과 모드를 선택해 주세요.");
  }
  const allies = names(r.allies, "아군", 2);
  const opponents = names(r.opponents, "상대", 3);
  if (new Set([...allies, ...opponents]).size !== 5) throw new DraftInputError("선택한 다섯 브롤러는 서로 달라야 합니다.");
  const banned = r.banned === undefined ? [] : names(r.banned, "밴 목록");
  if (banned.some((b) => allies.includes(b) || opponents.includes(b))) throw new DraftInputError("선택한 브롤러를 밴할 수 없습니다.");
  const candidates = r.candidates === undefined ? undefined : names(r.candidates, "추천 후보");
  const topK = r.topK === undefined ? 5 : r.topK;
  if (typeof topK !== "number" || !Number.isInteger(topK) || topK < 1 || topK > 20) {
    throw new DraftInputError("추천 개수는 1개에서 20개 사이로 선택해 주세요.");
  }
  return { map: r.map, mode: r.mode, allies, opponents, banned, candidates, topK };
}

function featureKeys(map: string, mode: string, ally: string[], enemy: string[]) {
  const result = [`map|${map}`, `mode|${mode}`];
  const allies = [...ally].sort();
  const opponents = [...enemy].sort();
  for (const [side, team] of [["ally", allies], ["enemy", opponents]] as const) {
    for (const b of team) {
      result.push(`${side}_brawler|${b}`, `${side}_map|${map}|${b}`, `${side}_mode|${mode}|${b}`);
    }
    for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) {
      result.push(`${side}_pair|${team[i]}|${team[j]}`);
    }
  }
  for (const a of allies) for (const b of opponents) result.push(`matchup|${a}|${b}`);
  return result;
}

export function predictDraftWinProbability(map: string, mode: string, allies: string[], opponents: string[]) {
  const raw = (a: string[], e: string[]) => {
    const z = artifact.intercept + featureKeys(map, mode, a, e).reduce((s, key) => s + (coefficients.get(key) ?? 0), 0);
    return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
  };
  return Math.max(1e-6, Math.min(1 - 1e-6, (raw(allies, opponents) + 1 - raw(opponents, allies)) / 2));
}

export function getDraftOptions() {
  return {
    version: artifact.version, season: artifact.season, sourceRevision: artifact.sourceRevision,
    sourceUrl: artifact.sourceUrl, trainingSets: artifact.trainingSets,
    allPlayersPower: artifact.allPlayersPower, dataStartUtc: artifact.dataStartUtc,
    dataEndUtc: artifact.dataEndUtc, trainingEndUtc: artifact.trainingEndUtc,
    brawlers: artifact.brawlers, mapModes: artifact.mapModes, defaultContext: artifact.defaultContext,
  };
}

export function recommendDraft(input: DraftInput) {
  const excluded = new Set([...input.allies, ...input.opponents, ...input.banned]);
  const pool = (input.candidates ?? artifact.brawlers).filter((b) => !excluded.has(b));
  if (!pool.length) throw new DraftInputError("선택 가능한 추천 후보가 없습니다. 밴과 후보 설정을 확인해 주세요.");
  const rows = pool.map((brawler) => {
    const stat = mapStats.get(JSON.stringify([input.map, input.mode, brawler]));
    const plays = stat?.plays ?? 0;
    const wins = stat?.wins ?? 0;
    return { brawler, probability: predictDraftWinProbability(input.map, input.mode,
      [...input.allies, brawler], input.opponents), trainingPlays: plays, wins,
      ...legacyMetaScore(wins, plays), unseenFeatures: featureKeys(input.map, input.mode,
        [...input.allies, brawler], input.opponents).filter((k) => !coefficients.has(k)).length };
  });
  const alphabetical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const modelRecommendations = [...rows].sort((a, b) => b.probability - a.probability ||
    b.trainingPlays - a.trainingPlays || alphabetical(a.brawler, b.brawler)).slice(0, input.topK);
  const baselineRecommendations = rows.filter((r) => r.trainingPlays >= 5).sort((a, b) => b.score - a.score ||
    b.trainingPlays - a.trainingPlays || b.winRate - a.winRate || alphabetical(a.brawler, b.brawler)).slice(0, input.topK);
  return { version: artifact.version, baselineSource: "season55-training", candidateCount: pool.length,
    modelRecommendations, baselineRecommendations };
}
