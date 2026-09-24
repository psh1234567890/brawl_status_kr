import type { Locale } from "../../i18n/config";
import { numberLocales } from "../../i18n/config";
import { shuffle } from "./random";

export type AbilityKind = "gadget" | "star-power";
export type AbilityQuizMode = "mixed" | "gadget" | "star-power";
export type AbilityQuizEntry = {
  id: number;
  kind: AbilityKind;
  ownerId: number;
  displayName: string;
  imageUrl: string | null;
};
export type AbilityOwnerChoice = { id: number; displayName: string; imageUrl: string | null };
export type AbilityQuizQuestion = AbilityQuizEntry & { choices: AbilityOwnerChoice[] };
export const ABILITY_QUESTION_COUNT = 10;
export const ABILITY_CANDIDATE_LIMIT = 30;

export function normalizeAbilityLabel(value: string, locale: Locale) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase(numberLocales[locale]);
}

export function buildAbilityQuestionDeck(
  abilities: readonly AbilityQuizEntry[],
  owners: readonly AbilityOwnerChoice[],
  mode: AbilityQuizMode,
  locale: Locale,
  rng: () => number = Math.random,
) {
  const ownerById = new Map(owners.filter(validOwner).map((owner) => [owner.id, owner]));
  const candidates = shuffle(abilities.filter((ability) => validAbility(ability) && ownerById.has(ability.ownerId) && (mode === "mixed" || ability.kind === mode)), rng)
    .slice(0, ABILITY_CANDIDATE_LIMIT);
  return candidates.flatMap((ability) => {
    const answer = ownerById.get(ability.ownerId)!;
    const choices = new Map<string, AbilityOwnerChoice>();
    choices.set(normalizeAbilityLabel(answer.displayName, locale), answer);
    for (const owner of shuffle([...ownerById.values()].filter((item) => item.id !== answer.id), rng)) {
      const key = normalizeAbilityLabel(owner.displayName, locale);
      if (key && !choices.has(key)) choices.set(key, owner);
      if (choices.size === 4) break;
    }
    if (choices.size !== 4) return [];
    return [{ ...ability, choices: shuffle([...choices.values()], rng) }];
  });
}

function validOwner(owner: AbilityOwnerChoice) {
  return Number.isInteger(owner.id) && owner.id > 0 && Boolean(owner.displayName.trim());
}

function validAbility(ability: AbilityQuizEntry) {
  return Number.isInteger(ability.id) && ability.id > 0 && Number.isInteger(ability.ownerId) &&
    ability.ownerId > 0 && Boolean(ability.displayName.trim()) &&
    (ability.kind === "gadget" || ability.kind === "star-power");
}
