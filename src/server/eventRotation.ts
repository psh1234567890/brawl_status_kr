import "server-only";

import type { EventRotationResponse, RotationEvent } from "../types/events";
import { fetchBrawlApiSnapshot } from "./upstream";

const ROTATION_TTL_MS = 60_000;
const ROTATION_MAX_AGE_MS = 5 * 60_000;

export class InvalidEventRotationError extends Error {
  constructor() {
    super("Invalid event rotation response");
    this.name = "InvalidEventRotationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function requiredText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw new InvalidEventRotationError();
  return value.trim();
}

/** Accept only explicit UTC timestamps, rejecting dates that Date.parse would roll over. */
function utcTimestamp(value: unknown) {
  if (typeof value !== "string") throw new InvalidEventRotationError();
  const compact = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/.exec(value);
  const expanded = compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}.${compact[7]}Z`
    : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(expanded)) {
    throw new InvalidEventRotationError();
  }
  const epoch = Date.parse(expanded);
  if (!Number.isFinite(epoch)) throw new InvalidEventRotationError();
  const iso = new Date(epoch).toISOString();
  const expected = expanded.includes(".") ? expanded : expanded.replace("Z", ".000Z");
  if (iso !== expected) throw new InvalidEventRotationError();
  return iso;
}

/** Reclassify every snapshot at request time so cached data never keeps an expired map active. */
export function normalizeEventRotation(
  value: unknown,
  fetchedAt: string,
  now = Date.now(),
): EventRotationResponse {
  if (!Array.isArray(value) || !Number.isFinite(now)) throw new InvalidEventRotationError();
  const response: EventRotationResponse = { active: [], upcoming: [], fetchedAt: utcTimestamp(fetchedAt) };
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isRecord(entry.event) ||
        !isPositiveInteger(entry.slotId) || !isPositiveInteger(entry.event.id)) {
      throw new InvalidEventRotationError();
    }
    const event: RotationEvent = {
      slotId: entry.slotId,
      mapId: entry.event.id,
      mode: requiredText(entry.event.mode),
      map: requiredText(entry.event.map),
      startTime: utcTimestamp(entry.startTime),
      endTime: utcTimestamp(entry.endTime),
    };
    const start = Date.parse(event.startTime);
    const end = Date.parse(event.endTime);
    if (start >= end) throw new InvalidEventRotationError();
    const key = `${event.slotId}:${event.mapId}:${event.startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (end <= now) continue;
    if (start <= now) response.active.push(event);
    else response.upcoming.push(event);
  }
  const order = (left: RotationEvent, right: RotationEvent) =>
    left.startTime.localeCompare(right.startTime) || left.slotId - right.slotId || left.mapId - right.mapId;
  response.active.sort(order);
  response.upcoming.sort(order);
  return response;
}

export async function getEventRotation(): Promise<EventRotationResponse> {
  const snapshot = await fetchBrawlApiSnapshot<unknown>(
    "/events/rotation", ROTATION_TTL_MS, ROTATION_MAX_AGE_MS,
  );
  return normalizeEventRotation(snapshot.data, snapshot.freshness.fetchedAt);
}
