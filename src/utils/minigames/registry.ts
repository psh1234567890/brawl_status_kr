import type { MinigameMessages } from "../../i18n/minigameMessages";

export type MiniGameDefinition = {
  id: string;
  href: string;
  enabled: boolean;
  titleKey: keyof MinigameMessages;
  descriptionKey: keyof MinigameMessages;
  stat?: "releasedBrawlers";
};

export const miniGames: readonly MiniGameDefinition[] = [
  {
    id: "brawler-quiz",
    href: "/minigames/brawler-quiz",
    enabled: true,
    titleKey: "quizTitle",
    descriptionKey: "quizDescription",
    stat: "releasedBrawlers",
  },
];
