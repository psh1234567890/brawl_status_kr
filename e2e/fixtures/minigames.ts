import type { Locale } from "../../src/i18n/config";
import { translateBrawlerName, translateModeName } from "../../src/utils/brawlTranslations";
import type { QuizBrawler } from "../../src/utils/minigames/brawlerQuiz";
import type { AbilityOwnerChoice, AbilityQuizEntry } from "../../src/utils/minigames/abilityQuiz";
import type { MapQuizEntry } from "../../src/utils/minigames/mapQuiz";

const brawlerNames = ["SHELLY", "COLT", "NITA", "BULL", "BROCK", "DYNAMIKE", "BO", "TICK", "8-BIT", "EMZ", "EL PRIMO", "BARLEY"] as const;
const cdn = "https://cdn.brawlify.com/";

export type MinigameFixtureData = {
  nameBrawlers: QuizBrawler[];
  silhouetteBrawlers: QuizBrawler[];
  maps: MapQuizEntry[];
  abilities: AbilityQuizEntry[];
  owners: AbilityOwnerChoice[];
};

export function getMinigameFixtureData(locale: Locale): MinigameFixtureData {
  const nameBrawlers = brawlerNames.map((rawName, index) => ({
    id: 16000000 + index,
    rawName,
    displayName: translateBrawlerName(rawName, locale),
    imageUrl: cdn + "brawlers/" + (16000000 + index) + ".png",
  }));
  const silhouetteBrawlers = nameBrawlers.map((brawler) => ({
    ...brawler,
    imageUrl: cdn + "brawlers/model/" + brawler.id + ".png",
  }));
  const maps = Array.from({ length: 24 }, (_, index) => {
    const modeName = index < 12 ? "Gem Grab" : "Solo Showdown";
    return {
      id: 15000000 + index,
      displayName: "Fixture Map " + String(index + 1).padStart(2, "0"),
      imageUrl: cdn + "maps/" + (15000000 + index) + ".png",
      modeId: index < 12 ? 1 : 2,
      modeName: translateModeName(modeName, locale),
    };
  });
  const owners = nameBrawlers.map((brawler) => ({
    id: brawler.id,
    displayName: brawler.displayName,
    imageUrl: null,
  }));
  const abilities = Array.from({ length: 48 }, (_, index) => {
    const kind = index < 24 ? "gadget" : "star-power";
    const kindIndex = index % 24;
    return {
      id: 23010000 + index,
      kind,
      ownerId: owners[kindIndex % owners.length].id,
      displayName: "Fixture " + (kind === "gadget" ? "Gadget " : "Star Power ") + String(kindIndex + 1).padStart(2, "0"),
      imageUrl: null,
    } as AbilityQuizEntry;
  });
  return { nameBrawlers, silhouetteBrawlers, maps, abilities, owners };
}
