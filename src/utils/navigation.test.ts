import { describe, expect, it } from "vitest";
import { isActiveNavigationItem } from "./navigation";

describe("primary navigation active section", () => {
  it("recognizes localized and unlocalized pages", () => {
    expect(isActiveNavigationItem("/events", "/events")).toBe(true);
    expect(isActiveNavigationItem("/en/events", "/events")).toBe(true);
    expect(isActiveNavigationItem("/pt-br/maps", "/maps")).toBe(true);
    expect(isActiveNavigationItem("/ja/status/", "/status")).toBe(true);
  });

  it("keeps the parent section active on nested dynamic and minigame pages", () => {
    expect(isActiveNavigationItem("/en/brawlers/16000000", "/brawlers")).toBe(true);
    expect(isActiveNavigationItem("/ru/minigames/map-quiz", "/minigames")).toBe(true);
    expect(isActiveNavigationItem("/maps/123", "/maps")).toBe(true);
  });

  it("does not highlight home or similarly prefixed sibling paths", () => {
    expect(isActiveNavigationItem("/en", "/")).toBe(true);
    expect(isActiveNavigationItem("/en/events", "/")).toBe(false);
    expect(isActiveNavigationItem("/en/events-more", "/events")).toBe(false);
    expect(isActiveNavigationItem("/brawlers", "/maps")).toBe(false);
    expect(isActiveNavigationItem("/en/minigames", "/gamemodes")).toBe(false);
  });
});
