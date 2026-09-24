import { describe, expect, it } from "vitest";
import type { BrawlifyBrawler, BrawlifyMap } from "../types/brawlify";
import { projectAbilityQuizData, projectMapQuizEntries, projectNameQuizBrawlers, projectSilhouetteBrawlers } from "./minigames";

const image = (id: number) => "https://cdn.brawlify.com/brawlers/model/" + id + ".png";

describe("mini game server projections", () => {
  it("filters unreleased or malformed brawlers and returns thin localized payloads", () => {
    const source = [
      { id: 16000000, name: "SHELLY", released: true, imageUrl2: "https://cdn.brawlify.com/brawlers/16000000.png", description: "private payload" },
      { id: 16000001, name: "UPCOMING", released: false },
      { id: 0, name: "bad" },
    ] satisfies BrawlifyBrawler[];
    expect(projectNameQuizBrawlers(source, "ko")).toEqual([
      { id: 16000000, rawName: "SHELLY", displayName: "쉘리", imageUrl: "https://cdn.brawlify.com/brawlers/16000000.png" },
    ]);
    expect(projectSilhouetteBrawlers(source, "ko").every((entry) => entry.imageUrl === image(entry.id))).toBe(true);
    expect(projectSilhouetteBrawlers(source, "ko").some((entry) => entry.id === 16000001)).toBe(false);
  });

  it("keeps only enabled, identified maps with CDN artwork and mode data", () => {
    const maps = [
      { id: 1, name: "Gem Map", imageUrl: "https://cdn.brawlify.com/maps/1.png", gameMode: { id: 1, name: "Gem Grab" } },
      { id: 2, name: "Disabled", disabled: true, imageUrl: "https://cdn.brawlify.com/maps/2.png", gameMode: { id: 1, name: "Gem Grab" } },
      { id: 3, name: "No art", imageUrl: "https://other.example/3.png", gameMode: { id: 1, name: "Gem Grab" } },
    ] satisfies BrawlifyMap[];
    expect(projectMapQuizEntries(maps, "en").map((entry) => entry.id)).toEqual([1]);
  });

  it("excludes unreleased, unlisted, cross-owner and localized label collisions", () => {
    const brawlers = [
      { id: 16000000, name: "SHELLY", released: true, gadgets: [{ id: 23000245, name: "SHARED", released: true }, { id: 23000076, name: "SHELL SHOCK", released: true }] },
      { id: 16000001, name: "COLT", released: true, gadgets: [
        { id: 23000245, name: "SHARED", released: true },
        { id: 23000316, name: "SHARED TWO", released: true },
        { id: 23000077, name: "SHELL SHOCK", released: true },
        { id: 23000080, name: "DISTINCT", released: true },
        { id: 23000080, name: "DISTINCT", released: true },
      ] },
      { id: 16000002, name: "NITA", released: true, gadgets: [
        { id: 23000316, name: "SHARED TWO", released: true },
        { id: 23000078, name: "SHELL SHOCK", released: true },
      ] },
      { id: 16000003, name: "UPCOMING", released: false, gadgets: [{ id: 23000079, name: "UPCOMING", released: true }] },
    ] satisfies BrawlifyBrawler[];
    const projected = projectAbilityQuizData(brawlers, "ko", {
      translate: (_id, name) => name === "SHELL SHOCK" ? "공통 이름" : name,
      hasTranslation: () => true,
    });
    expect(projected.abilities.some((entry) => [23000245, 23000316, 23000077, 23000078, 23000079].includes(entry.id))).toBe(false);
    expect(projected.abilities.some((entry) => entry.id === 23000079)).toBe(false);
    expect(projected.abilities.filter((entry) => entry.id === 23000080)).toHaveLength(1);
    expect(projected.abilities.every((entry) => !("description" in entry))).toBe(true);
  });
});
