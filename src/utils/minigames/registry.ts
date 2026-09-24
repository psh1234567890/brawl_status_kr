export const miniGameIds = [
  "brawler-quiz",
  "silhouette-quiz",
  "higher-lower",
  "map-quiz",
  "ability-quiz",
  "release-order",
] as const;

export type MiniGameId = (typeof miniGameIds)[number];
export type BlockedGameReason = "data-pending";

export type MiniGameDefinition = {
  id: MiniGameId;
  href:
    | "/minigames/brawler-quiz"
    | "/minigames/silhouette-quiz"
    | "/minigames/higher-lower"
    | "/minigames/map-quiz"
    | "/minigames/ability-quiz"
    | "/minigames/release-order";
  enabled: boolean;
  blockedReason?: BlockedGameReason;
};

export const miniGames: readonly MiniGameDefinition[] = [
  { id: "brawler-quiz", href: "/minigames/brawler-quiz", enabled: true },
  { id: "silhouette-quiz", href: "/minigames/silhouette-quiz", enabled: true },
  { id: "higher-lower", href: "/minigames/higher-lower", enabled: false, blockedReason: "data-pending" },
  { id: "map-quiz", href: "/minigames/map-quiz", enabled: true },
  { id: "ability-quiz", href: "/minigames/ability-quiz", enabled: true },
  { id: "release-order", href: "/minigames/release-order", enabled: false, blockedReason: "data-pending" },
];
