"use client";

import { useMemo, useState } from "react";
import type { Brawler } from "../types/brawl";
import { numberLocales, type Locale } from "../i18n/config";
import { translateBrawlerName } from "../utils/brawlTranslations";
import { calculatePlayerProgression } from "../utils/playerProgression";
import StatSymbol from "./StatSymbol";

const en = {
  title: "Brawler upgrade progress", subtitle: "Power levels of Brawlers you currently own",
  progress: "Power upgrade progress (coin-cost basis)", full: "At Power 11",
  coins: "Coins to Power 11", points: "Power Points to 11", owned: "Owned Brawlers",
  hyper: "Owned Hypercharges", gadgets: "Owned Gadgets", stars: "Owned Star Powers",
  show: "Show costs per Brawler", hide: "Hide costs", level: "Power",
  unknown: "Brawlers with unknown power levels are excluded from the estimates.",
  note: "Only fixed level-up costs for owned Brawlers. Excludes unowned Brawlers, Gadgets, Star Powers, Gears, Hypercharges, Buffies and your current resources. Costs may change after game updates.",
};
const ko: typeof en = {
  title: "브롤러 성장률·강화 비용", subtitle: "현재 보유한 브롤러의 파워 레벨 육성 현황",
  progress: "파워 레벨 강화 진행률 (코인 기준)", full: "파워 11 달성",
  coins: "11레벨까지 필요 코인", points: "필요 파워 포인트", owned: "보유 브롤러",
  hyper: "보유 하이퍼차지", gadgets: "보유 가젯", stars: "보유 스타파워",
  show: "브롤러별 강화 비용 보기", hide: "강화 비용 접기", level: "파워",
  unknown: "레벨을 확인할 수 없는 브롤러는 비용 계산에서 제외했어.",
  note: "현재 보유한 브롤러의 11레벨 강화 비용만 계산했어. 미보유 브롤러 해금, 가젯·스타파워·기어·하이퍼차지·버피 구매 비용 및 현재 보유 재화는 포함하지 않아. 게임 내 가격이 바뀌면 실제 비용과 차이가 날 수 있어.",
};
const ja: typeof en = {
  title: "キャラクター育成・強化費用", subtitle: "所持キャラクターのパワーレベル進行状況",
  progress: "パワー強化の進捗（コイン基準）", full: "パワー11達成",
  coins: "必要コイン", points: "必要パワーポイント", owned: "所持キャラクター",
  hyper: "所持ハイパーチャージ", gadgets: "所持ガジェット", stars: "所持スターパワー",
  show: "キャラクター別の費用", hide: "閉じる", level: "パワー",
  unknown: "パワーレベルが不明なキャラクターは計算から除外しています。",
  note: "所持キャラクターをパワー11まで強化する固定費用のみ。未所持キャラの解放、ガジェット、スターパワー、ギア、ハイパーチャージ、バフィー、現在の所持資源は含みません。価格は変更される場合があります。",
};
const ptBr: typeof en = {
  title: "Evolução e custos dos Brawlers", subtitle: "Progresso de poder dos Brawlers que você possui",
  progress: "Melhorias de poder (por custo em moedas)", full: "No poder 11",
  coins: "Moedas até poder 11", points: "Pontos de poder necessários", owned: "Brawlers obtidos",
  hyper: "Hipercargas", gadgets: "Acessórios", stars: "Poderes de estrela",
  show: "Ver custo por Brawler", hide: "Ocultar detalhes", level: "Poder",
  unknown: "Brawlers com nível desconhecido não entram na estimativa.",
  note: "Apenas custos fixos para evoluir Brawlers obtidos até poder 11. Não inclui desbloqueios, habilidades, equipamentos, Buffies ou saldo de recursos. Os custos podem mudar.",
};
const es: typeof en = {
  title: "Progreso y costes de los Brawlers", subtitle: "Evolución de los brawlers obtenidos",
  progress: "Mejoras de fuerza (según coste en monedas)", full: "A fuerza 11",
  coins: "Monedas hasta fuerza 11", points: "Puntos de fuerza necesarios", owned: "Brawlers obtenidos",
  hyper: "Hipercargas", gadgets: "Accesorios", stars: "Habilidades estelares",
  show: "Ver costes por brawler", hide: "Ocultar detalles", level: "Fuerza",
  unknown: "Se excluyen los brawlers con niveles desconocidos.",
  note: "Solo costes fijos para subir a fuerza 11 los brawlers obtenidos. No incluye desbloqueos, habilidades, equipos, Buffies ni recursos actuales. Los costes pueden cambiar.",
};
const tr: typeof en = {
  title: "Karakter gelişimi ve maliyetleri", subtitle: "Sahip olduğun karakterlerin güç seviyeleri",
  progress: "Güç yükseltme ilerlemesi (altın maliyetine göre)", full: "Güç 11",
  coins: "Güç 11 için gereken altın", points: "Gereken güç puanları", owned: "Karakterler",
  hyper: "Hiper şarjlar", gadgets: "Aksesuarlar", stars: "Yıldız güçleri",
  show: "Karakter maliyetlerini göster", hide: "Ayrıntıları gizle", level: "Güç",
  unknown: "Güç seviyesi bilinmeyen karakterler hesaplamaya dahil edilmez.",
  note: "Yalnızca sahip olunan karakterlerin Güç 11'e yükseltme masraflarıdır. Yeni karakterler, yetenekler, ekipmanlar, Buffies ve mevcut kaynaklar dahil değildir. Maliyetler değişebilir.",
};
const de: typeof en = {
  title: "Brawler-Fortschritt und Kosten", subtitle: "Power-Level deiner eigenen Brawler",
  progress: "Upgrade-Fortschritt (nach Münzkosten)", full: "Auf Power 11",
  coins: "Münzen bis Power 11", points: "Benötigte Powerpunkte", owned: "Eigene Brawler",
  hyper: "Hypercharges", gadgets: "Gadgets", stars: "Star Powers",
  show: "Kosten pro Brawler anzeigen", hide: "Details ausblenden", level: "Power",
  unknown: "Brawler mit unbekanntem Power-Level werden nicht geschätzt.",
  note: "Nur feste Level-Up-Kosten für eigene Brawler bis Power 11. Ohne Freischaltungen, Fähigkeiten, Ausrüstung, Buffies und aktuelle Ressourcen. Kosten können sich ändern.",
};
const fr: typeof en = {
  title: "Progression et coûts des Brawlers", subtitle: "Niveaux de puissance des Brawlers possédés",
  progress: "Progression des améliorations (en pièces)", full: "Puissance 11",
  coins: "Pièces jusqu'à puissance 11", points: "Points de pouvoir requis", owned: "Brawlers possédés",
  hyper: "Hypercharges", gadgets: "Gadgets", stars: "Pouvoirs star",
  show: "Voir le coût par Brawler", hide: "Masquer les détails", level: "Puissance",
  unknown: "Les Brawlers dont le niveau est inconnu sont exclus.",
  note: "Coûts fixes pour améliorer les Brawlers possédés jusqu'au niveau 11. Sans déblocages, capacités, équipements, Buffies ou ressources actuelles. Les coûts peuvent changer.",
};
const it: typeof en = {
  title: "Progressi e costi dei Brawler", subtitle: "Livelli di potenza dei Brawler posseduti",
  progress: "Progresso potenziamenti (in monete)", full: "A potenza 11",
  coins: "Monete fino a potenza 11", points: "Punti energia necessari", owned: "Brawler posseduti",
  hyper: "Ipercariche", gadgets: "Gadget", stars: "Abilità stellari",
  show: "Mostra costi per Brawler", hide: "Nascondi dettagli", level: "Potenza",
  unknown: "Sono esclusi i Brawler con livello sconosciuto.",
  note: "Solo costi fissi per portare a potenza 11 i Brawler posseduti. Esclusi sblocchi, abilità, equipaggiamenti, Buffies e risorse attuali. I costi possono variare.",
};
const ru: typeof en = {
  title: "Развитие бойцов и стоимость улучшений", subtitle: "Уровни силы ваших бойцов",
  progress: "Прогресс улучшений (по стоимости монет)", full: "На 11 уровне силы",
  coins: "Монет до 11 уровня", points: "Нужно очков силы", owned: "Полученные бойцы",
  hyper: "Гиперзаряды", gadgets: "Гаджеты", stars: "Звёздные силы",
  show: "Стоимость по каждому бойцу", hide: "Скрыть подробности", level: "Сила",
  unknown: "Бойцы с неизвестным уровнем силы не учитываются.",
  note: "Учтена только фиксированная стоимость повышения имеющихся бойцов до 11 уровня. Не включены разблокировка бойцов, способности, снаряжение, Buffies и текущие ресурсы. Цены могут измениться.",
};

const localized = { ko, en, ja, "pt-br": ptBr, es, tr, de, fr, it, ru } satisfies Record<Locale, typeof en>;

export default function PlayerProgressionPanel({ brawlers, locale = "ko" }: {
  brawlers: Brawler[];
  locale?: Locale;
}) {
  const data = useMemo(() => calculatePlayerProgression(brawlers), [brawlers]);
  const copy = localized[locale];
  const [expanded, setExpanded] = useState(false);
  const fmt = (n: number) => n.toLocaleString(numberLocales[locale]);
  return (
    <section aria-labelledby="player-progression-title" className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 id="player-progression-title" className="text-lg font-black text-slate-950">{copy.title}</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">{copy.subtitle}</p>
      <div className="mt-4 rounded-lg bg-blue-50 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-black text-blue-950">{copy.progress}</span>
          <strong className="text-2xl tabular-nums text-blue-800">
            {data.percent === null ? "—" : data.percent.toFixed(1) + "%"}
          </strong>
        </div>
        <div role="progressbar" aria-label={copy.progress} aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={data.percent ?? undefined}
          className="mt-3 h-3 overflow-hidden rounded-full bg-blue-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: String(data.percent ?? 0) + "%" }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-blue-800">
          {copy.full}: {fmt(data.power11)} / {fmt(data.measuredBrawlers)}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label={copy.coins} value={fmt(data.coins)} icon="coin" />
        <Metric label={copy.points} value={fmt(data.powerPoints)} icon="level" />
        <Metric label={copy.owned} value={fmt(data.ownedBrawlers)} icon="battle" />
        <Metric label={copy.hyper} value={fmt(data.hyperCharges)} icon="hyper" />
      </div>
      <p className="mt-3 text-xs font-bold text-slate-600">
        {copy.gadgets}: {fmt(data.gadgets)} · {copy.stars}: {fmt(data.starPowers)}
      </p>
      {data.unknownLevels > 0 ? <p role="status" className="mt-2 text-xs text-amber-700">{copy.unknown}</p> : null}
      <p className="mt-3 text-xs leading-5 text-slate-500">{copy.note}</p>
      {data.upgrades.length > 0 ? <>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
          className="mt-4 min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50">
          {expanded ? copy.hide : copy.show}
        </button>
        {expanded ? <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[430px] text-left text-sm">
            <thead className="bg-slate-50"><tr>
              <th scope="col" className="p-3">{copy.owned}</th><th scope="col" className="p-3">{copy.level}</th>
              <th scope="col" className="p-3 text-right">{copy.coins}</th>
              <th scope="col" className="p-3 text-right">{copy.points}</th>
            </tr></thead>
            <tbody>{data.upgrades.map((item) => <tr key={item.id} className="border-t border-slate-100">
              <td className="p-3 font-semibold">{translateBrawlerName(item.name, locale)}</td>
              <td className="p-3 tabular-nums">{item.power}</td>
              <td className="p-3 text-right tabular-nums">{fmt(item.coins)}</td>
              <td className="p-3 text-right tabular-nums">{fmt(item.powerPoints)}</td>
            </tr>)}</tbody>
          </table>
        </div> : null}
      </> : null}
    </section>
  );
}

function Metric({ label, value, icon }: {
  label: string; value: string; icon: "coin" | "level" | "battle" | "hyper";
}) {
  return <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-black text-slate-500">{label}</p>
    <p className="mt-1 flex items-center gap-1 text-lg font-black tabular-nums text-slate-950">
      <StatSymbol kind={icon} size={18} />{value}
    </p>
  </div>;
}
