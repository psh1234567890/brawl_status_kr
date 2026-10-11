"use client";

import { useState } from "react";
import Link from "next/link";
import { localizedHref, numberLocales, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import type { PersonalBestRecord } from "../../utils/minigames/personalBest";

const copy: Record<Locale, { title: string; load: string; empty: string; signIn: string; failed: string }> = {
  ko: { title: "내 계정 최고 기록", load: "기록 불러오기", empty: "저장된 기록이 없습니다.", signIn: "로그인 후 계정 기록을 확인할 수 있습니다.", failed: "기록을 불러오지 못했습니다." },
  en: { title: "Account personal bests", load: "Load bests", empty: "No saved records yet.", signIn: "Sign in to view account records.", failed: "Couldn't load saved records." },
  ja: { title: "アカウントの最高記録", load: "記録を表示", empty: "保存された記録はありません。", signIn: "ログインして記録を確認してください。", failed: "記録を読み込めませんでした。" },
  "pt-br": { title: "Recordes da conta", load: "Ver recordes", empty: "Nenhum recorde salvo.", signIn: "Entre na conta para ver recordes.", failed: "Não foi possível carregar os recordes." },
  es: { title: "Récords de la cuenta", load: "Ver récords", empty: "Todavía no hay récords.", signIn: "Inicia sesión para ver tus récords.", failed: "No se pudieron cargar los récords." },
  tr: { title: "Hesap rekorları", load: "Rekorları göster", empty: "Kayıtlı rekor yok.", signIn: "Rekorlarını görmek için giriş yap.", failed: "Rekorlar yüklenemedi." },
  de: { title: "Bestleistungen im Konto", load: "Bestleistungen laden", empty: "Noch keine gespeicherten Werte.", signIn: "Melde dich an, um deine Bestleistungen zu sehen.", failed: "Bestleistungen konnten nicht geladen werden." },
  fr: { title: "Meilleurs scores du compte", load: "Voir les records", empty: "Aucun record enregistré.", signIn: "Connectez-vous pour voir vos records.", failed: "Impossible de charger les records." },
  it: { title: "Record dell'account", load: "Mostra record", empty: "Nessun record salvato.", signIn: "Accedi per vedere i tuoi record.", failed: "Impossibile caricare i record." },
  ru: { title: "Рекорды аккаунта", load: "Показать рекорды", empty: "Пока нет сохранённых рекордов.", signIn: "Войдите, чтобы посмотреть рекорды.", failed: "Не удалось загрузить рекорды." },
};

export default function AccountBestPreview({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "signIn" | "error">("idle");
  const [bests, setBests] = useState<PersonalBestRecord[]>([]);
  const messages = copy[locale];
  const gameNames = getMinigameMessages(locale).games;

  async function load() {
    setStatus("loading");
    try {
      const response = await fetch("/api/account/minigame-bests", { cache: "no-store", credentials: "same-origin" });
      if ([401, 403, 404, 503].includes(response.status)) {
        setStatus("signIn");
        return;
      }
      if (!response.ok) throw new Error("Unable to load account records");
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("personalBests" in body) ||
          !Array.isArray(body.personalBests)) throw new Error("Unexpected records");
      const records = (body.personalBests as PersonalBestRecord[]).filter((item) =>
        item && typeof item === "object" &&
        typeof item.gameId === "string" && Object.hasOwn(gameNames, item.gameId) &&
        typeof item.mode === "string" && Number.isSafeInteger(item.score) &&
        Number.isSafeInteger(item.total) && item.total > 0 && item.score >= 0 && item.score <= item.total,
      );
      setBests(records);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section aria-label={messages.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-950">{messages.title}</h2>
        <button type="button" onClick={() => void load()} disabled={status === "loading"}
          className="min-h-10 rounded-lg border border-blue-600 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
          {messages.load}
        </button>
      </div>
      {status === "loading" ? <p role="status" className="mt-3 text-sm text-slate-600">...</p> : null}
      {status === "signIn" ? <p className="mt-3 text-sm text-slate-600">{messages.signIn} <Link className="underline" href={localizedHref(locale, "/account")}>{messages.title}</Link></p> : null}
      {status === "error" ? <p role="alert" className="mt-3 text-sm text-slate-600">{messages.failed}</p> : null}
      {status === "ready" && bests.length === 0 ? <p className="mt-3 text-sm text-slate-600">{messages.empty}</p> : null}
      {status === "ready" && bests.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-live="polite">
          {bests.map((best) => (
            <li key={`${best.gameId}:${best.mode}:${best.rulesetVersion}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
              <span className="font-semibold">{gameNames[best.gameId].title} · {best.mode}</span>
              <strong className="text-blue-800">{best.score.toLocaleString(numberLocales[locale])} / {best.total.toLocaleString(numberLocales[locale])}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
