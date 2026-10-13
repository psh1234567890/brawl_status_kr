import type { Locale } from "./config";
export const profileReturnMessages: Record<Locale, { previous: string; saved: string; local: string }> = {
  ko: { previous: "지난 조회 대비", saved: "저장한 플레이어", local: "이 기기의 마지막 조회" },
  en: { previous: "Since last check", saved: "Saved players", local: "Last checked on this device" },
  ja: { previous: "前回の確認から", saved: "保存したプレイヤー", local: "この端末での最終確認" },
  "pt-br": { previous: "Desde a última consulta", saved: "Jogadores salvos", local: "Última consulta neste dispositivo" },
  es: { previous: "Desde la última consulta", saved: "Jugadores guardados", local: "Última consulta en este dispositivo" },
  tr: { previous: "Son kontrole göre", saved: "Kaydedilen oyuncular", local: "Bu cihazdaki son kontrol" },
  de: { previous: "Seit der letzten Abfrage", saved: "Gespeicherte Spieler", local: "Letzte Abfrage auf diesem Gerät" },
  fr: { previous: "Depuis la dernière consultation", saved: "Joueurs enregistrés", local: "Dernière consultation sur cet appareil" },
  it: { previous: "Dall'ultima ricerca", saved: "Giocatori salvati", local: "Ultima ricerca su questo dispositivo" },
  ru: { previous: "С прошлого просмотра", saved: "Сохранённые игроки", local: "Последний просмотр на этом устройстве" },
};
