import { describe, expect, it } from "vitest";
import { accountDeletionMessages, accountMessages, getAccountErrorMessage } from "./accountMessages";
import { locales } from "./config";

function flattenStrings(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      Object.entries(flattenStrings(child, prefix ? `${prefix}.${key}` : key)),
    ),
  );
}

function placeholders(value: string) {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

describe("account messages", () => {
  it("provides non-empty translations for every locale and message key", () => {
    const keys = Object.keys(accountMessages.ko).sort();
    for (const locale of locales) {
      const messages = accountMessages[locale];
      expect(Object.keys(messages).sort()).toEqual(keys);
      for (const value of Object.values(messages)) {
        if (typeof value === "string") expect(value.trim()).not.toBe("");
      }
      expect(messages.sync.localOnly.trim()).not.toBe("");
      expect(Object.values(messages.gameNames).every(Boolean)).toBe(true);
      expect(Object.values(messages.errorMessages).every(Boolean)).toBe(true);
      for (const value of Object.values(accountDeletionMessages[locale])) {
        expect(value.trim()).not.toBe("");
      }
      expect(accountDeletionMessages[locale].pendingSignOut).toContain("{count}");
    }
  });

  it("keeps placeholders consistent and never exposes unknown server errors", () => {
    const englishStrings = flattenStrings(accountMessages.en);
    for (const locale of locales) {
      const localizedStrings = flattenStrings(accountMessages[locale]);
      expect(Object.keys(localizedStrings).sort()).toEqual(Object.keys(englishStrings).sort());
      for (const key of Object.keys(englishStrings)) {
        expect(placeholders(localizedStrings[key])).toEqual(placeholders(englishStrings[key]));
      }
      expect(placeholders(accountDeletionMessages[locale].pendingSignOut)).toEqual(["count"]);
    }
    expect(getAccountErrorMessage("ko", "secret-bearing-unknown-code")).toBe(
      accountMessages.ko.errorGeneric,
    );
  });
});
