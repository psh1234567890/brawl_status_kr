"use client";

import { useEffect } from "react";
import { numberLocales, type Locale } from "../i18n/config";
import { getComponentMessages } from "../i18n/componentMessages";
import {
  formatBattles,
  formatCurrentBrawlerLine,
  formatDefaultSkin,
  formatNoneOwned,
  formatOwnedCount,
  formatTopMode,
  formatWins,
} from "../i18n/formatters";
import type {
  BrawlAbility,
  Brawler,
  BrawlerStat,
  PlayerOwnedSkin,
  PlayerSkinInventoryStatus,
} from "../types/brawl";
import {
  translateAbilityName,
  translateBrawlerName,
  translateGearName,
  translateModeName,
  translateSkinName,
} from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

interface BrawlerDetailsModalProps {
  brawler: Brawler;
  externalSkins?: PlayerOwnedSkin[];
  skinInventoryStatus?: PlayerSkinInventoryStatus;
  skinInventoryError?: string;
  recentStat: BrawlerStat & { topMode: string };
  dbStat?: BrawlerStat;
  onClose: () => void;
  locale?: Locale;
}

export default function BrawlerDetailsModal({
  brawler,
  externalSkins = [],
  skinInventoryStatus = "idle",
  skinInventoryError = "",
  recentStat,
  dbStat,
  onClose,
  locale = "ko",
}: BrawlerDetailsModalProps) {
  useCloseOnEscape(onClose);
  const copy = getComponentMessages(locale).brawlerDetails;
  const ownedSkins = getOwnedSkins(brawler, externalSkins, locale);
  const displayName = translateBrawlerName(brawler.name, locale);
  const isSkinLoading = skinInventoryStatus === "loading";
  const hasSkinError = skinInventoryStatus === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="brawler-dialog-title"
        className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-2xl sm:rounded-xl sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-xl font-black text-slate-700 transition-colors hover:bg-slate-200"
        >
          ×
        </button>

        <div className="flex items-center gap-4 pr-12">
          <BrawlImage
            src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
            alt={displayName}
            width={96}
            height={96}
            fallbackText={displayName.slice(0, 1)}
            className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-cover sm:h-24 sm:w-24"
          />
          <div className="min-w-0">
            <h2 id="brawler-dialog-title" className="truncate text-2xl font-black text-slate-950 sm:text-3xl">
              {displayName}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {formatCurrentBrawlerLine(locale, brawler.trophies.toLocaleString(numberLocales[locale]), brawler.power)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniMetric label={copy.highestTrophies} value={brawler.highestTrophies.toLocaleString(numberLocales[locale])} />
          <MiniMetric label={copy.gadgets} value={formatOwnedCount(locale, brawler.gadgets?.length ?? 0)} />
          <MiniMetric label={copy.starPowers} value={formatOwnedCount(locale, brawler.starPowers?.length ?? 0)} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 space-y-4">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-slate-950">{copy.skins}</h3>
                <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600">
                  {formatOwnedCount(locale, ownedSkins.length)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <BrawlImage
                  src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
                  alt={brawler.skin ? translateSkinName(brawler.skin.id, brawler.skin.name, locale) : displayName}
                  width={48}
                  height={48}
                  fallbackText={displayName.slice(0, 1)}
                  className="h-12 w-12 shrink-0 rounded-lg bg-slate-50 object-cover"
                  title={copy.skinImageFallback}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    {brawler.skin
                      ? translateSkinName(brawler.skin.id, brawler.skin.name, locale)
                      : copy.defaultSkin}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{copy.equippedInfo}</p>
                </div>
              </div>

              {ownedSkins.length ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ownedSkins.map((skin) => (
                    <div
                      key={skin.key}
                      className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                        skin.isEquipped
                          ? "border-blue-200 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                      title={skin.name}
                    >
                      <span className="line-clamp-2">
                        {formatSkinName(skin, displayName, brawler.name, locale)}
                      </span>
                      <span className="mt-1 block text-[11px] font-black text-slate-400">
                        {skin.source === "official" ? copy.officialApi : copy.brawlaceLookup}
                      </span>
                      {skin.isEquipped ? (
                        <span className="mt-1 block text-[11px] font-black text-blue-600">
                          {copy.equipped}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs font-bold text-slate-500">
                  {isSkinLoading
                    ? copy.skinLoading
                    : skinInventoryStatus === "idle"
                      ? copy.skinNotLoaded
                      : hasSkinError
                      ? copy.skinPartial
                      : copy.noOwnedSkins}
                </p>
              )}

              {hasSkinError ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-black text-amber-700">
                  {locale === "ko" && skinInventoryError ? skinInventoryError : copy.skinLookupFailed}
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-black text-slate-950">{copy.ownedEquipment}</h3>
              <div className="grid gap-4">
                <AbilityGroup label={copy.gadgets} abilities={brawler.gadgets} imageType="gadgets" tone="green" locale={locale} emptyText={formatNoneOwned(locale, copy.gadgets)} />
                <AbilityGroup label={copy.starPowers} abilities={brawler.starPowers} imageType="star-powers" tone="amber" locale={locale} emptyText={formatNoneOwned(locale, copy.starPowers)} />
                <AbilityGroup label={copy.hypercharge} abilities={brawler.hyperCharges} imageType="hypercharges" tone="violet" locale={locale} emptyText={formatNoneOwned(locale, copy.hypercharge)} />
                <GearGroup brawler={brawler} locale={locale} />
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            {brawler.buffies ? (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-black text-slate-950">{copy.buffieStatus}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    [copy.gadgets, brawler.buffies.gadget],
                    [copy.starPowers, brawler.buffies.starPower],
                    [copy.hyperShort, brawler.buffies.hyperCharge],
                  ].map(([label, active]) => (
                    <span
                      key={String(label)}
                      className={`rounded-lg border px-2 py-2 text-center text-xs font-black ${
                        active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <StatsCard
              title={copy.recentStats}
              stat={recentStat}
              extra={recentStat.plays > 0 ? formatTopMode(locale, translateModeName(recentStat.topMode, locale)) : undefined}
              locale={locale}
            />
            <StatsCard title={copy.dbStats} stat={dbStat} locale={locale} />
          </aside>
        </div>
      </section>
    </div>
  );
}

type DisplaySkin = {
  id?: number;
  isEquipped: boolean;
  key: string;
  name: string;
  source: "official" | "brawlace";
};

function getOwnedSkins(
  brawler: Brawler,
  externalSkins: PlayerOwnedSkin[],
  locale: Locale,
) {
  const byKey = new Map<string, DisplaySkin>();
  const knownNames = new Set<string>();

  for (const skin of brawler.skins ?? []) {
    const normalizedName = normalizeSkinName(skin.name);
    knownNames.add(normalizedName);
    byKey.set(`id:${skin.id}`, {
      id: skin.id,
      isEquipped: brawler.skin?.id === skin.id,
      key: `id:${skin.id}`,
      name: skin.name,
      source: "official",
    });
  }

  if (brawler.skin) {
    knownNames.add(normalizeSkinName(brawler.skin.name));
    byKey.set(`id:${brawler.skin.id}`, {
      id: brawler.skin.id,
      isEquipped: true,
      key: `id:${brawler.skin.id}`,
      name: brawler.skin.name,
      source: "official",
    });
  }

  for (const skin of externalSkins) {
    const normalizedName = normalizeSkinName(skin.name);
    if (knownNames.has(normalizedName)) continue;
    knownNames.add(normalizedName);
    byKey.set(`name:${normalizedName}`, {
      id: skin.id,
      isEquipped:
        brawler.skin !== undefined &&
        normalizedName === normalizeSkinName(brawler.skin.name),
      key: `name:${normalizedName}`,
      name: skin.name,
      source: skin.source,
    });
  }

  return [...byKey.values()].sort((left, right) =>
    formatSkinName(left, translateBrawlerName(brawler.name, locale), brawler.name, locale).localeCompare(
      formatSkinName(right, translateBrawlerName(brawler.name, locale), brawler.name, locale),
      numberLocales[locale],
    ),
  );
}

function formatSkinName(
  skin: DisplaySkin,
  displayBrawlerName: string,
  brawlerName: string,
  locale: Locale,
) {
  if (skin.id !== undefined) return translateSkinName(skin.id, skin.name, locale);
  if (normalizeSkinName(skin.name) === normalizeSkinName(brawlerName)) {
    return formatDefaultSkin(locale, displayBrawlerName);
  }
  return toTitleCase(skin.name);
}

function normalizeSkinName(value: string) {
  return value
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "");
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^[ivx]+$/i.test(word)) return word.toUpperCase();
      return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function AbilityGroup({
  label,
  abilities,
  imageType,
  tone,
  locale,
  emptyText,
}: {
  label: string;
  abilities?: BrawlAbility[];
  imageType: string;
  tone: "green" | "amber" | "violet";
  locale: Locale;
  emptyText: string;
}) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];

  return (
    <div>
      <h4 className="mb-2 text-xs font-black text-slate-500">{label}</h4>
      {abilities?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {abilities.map((ability) => (
            <div key={ability.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <BrawlImage
                src={`https://cdn.brawlify.com/${imageType}/regular/${ability.id}.png`}
                alt={ability.name}
                width={36}
                height={36}
                fallbackText={label.slice(0, 1)}
                className={`h-9 w-9 shrink-0 rounded-lg ${toneClass}`}
              />
              <span className="min-w-0 truncate text-sm font-black text-slate-800">
                {translateAbilityName(ability.id, ability.name, locale)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-bold text-slate-400">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function GearGroup({ brawler, locale }: { brawler: Brawler; locale: Locale }) {
  const copy = getComponentMessages(locale).brawlerDetails;
  return (
    <div>
      <h4 className="mb-2 text-xs font-black text-slate-500">{copy.gears}</h4>
      {brawler.gears?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {brawler.gears.map((gear) => (
            <div key={gear.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <BrawlImage
                src={`https://cdn.brawlify.com/gears/regular/${gear.id}.png`}
                alt={gear.name}
                width={36}
                height={36}
                fallbackText="G"
                className="h-9 w-9 shrink-0 rounded-lg bg-slate-100"
              />
              <span className="min-w-0 truncate text-sm font-black text-slate-800">
                {translateGearName(gear.id, gear.name, locale)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-bold text-slate-400">
          {formatNoneOwned(locale, copy.gears)}
        </p>
      )}
    </div>
  );
}

function StatsCard({
  title,
  stat,
  extra,
  locale,
}: {
  title: string;
  stat?: BrawlerStat;
  extra?: string;
  locale: Locale;
}) {
  const copy = getComponentMessages(locale).brawlerDetails;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      {stat && stat.plays > 0 ? (
        <div className="mt-3 space-y-2 text-sm font-bold text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <span>{copy.winRate}</span>
            <span className="text-2xl font-black text-blue-700">{stat.winRate}%</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>{copy.plays}</span>
            <span>{formatBattles(locale, stat.plays)} · {formatWins(locale, stat.wins)}</span>
          </div>
          {extra ? <p className="rounded-lg bg-slate-50 p-2 text-xs font-black text-slate-600">{extra}</p> : null}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-400">
          {copy.noStats}
        </p>
      )}
    </section>
  );
}

function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
}
