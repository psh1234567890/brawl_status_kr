import type { ReactNode } from "react";
import Image from "next/image";

export type StatSymbolKind =
  | "trophy" | "star" | "shield" | "battle" | "timer"
  | "players" | "level" | "win" | "skin" | "gadget"
  | "super" | "hyper" | "gear" | "map" | "chart"
  | "gem" | "coin" | "bling" | "share"
  | "community" | "gamepad" | "search" | "modes" | "team" | "target";

/** In-game trophy/coin artwork; all remaining symbols are generic UI icons. */
export default function StatSymbol({
  kind, size = 16, className = "",
}: { kind: StatSymbolKind; size?: number; className?: string }) {
  const artwork = kind === "trophy"
    ? "/game-assets/trophy.png"
    : kind === "coin"
      ? "/game-assets/coin.png"
      : null;
  if (artwork) {
    return (
      <Image
        src={artwork}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        unoptimized
        className={`inline-block shrink-0 object-contain ${className}`}
      />
    );
  }
  const paths: Record<StatSymbolKind, ReactNode> = {
    trophy: null,
    star: <path d="m12 2 3.1 6.4 7.1 1-5.1 5 1.2 7.1L12 18.1l-6.3 3.4 1.2-7.1-5.1-5 7.1-1L12 2Z" />,
    shield: <path d="m12 2 8 3v6c0 5.5-3 9-8 11-5-2-8-5.5-8-11V5l8-3Z" />,
    community: <><path d="M14 15H7l-4 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v6a4 4 0 0 1-4 4Z" /><path d="M9 18h8l4 3V10a2 2 0 0 0-2-2M7 7h7M7 11h4" /></>,
    gamepad: <><path d="M7 6h10a4 4 0 0 1 4 3l1 8a2 2 0 0 1-3 2l-4-3H9l-4 3a2 2 0 0 1-3-2l1-8a4 4 0 0 1 4-3Z" /><path d="M6 11h4M8 9v4M16 10h.01M18 13h.01" /></>,
    search: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></>,
    modes: <><path d="M5 22V3m0 1c5-5 9 5 15 0v11c-6 5-10-5-15 0" /></>,
    team: <><circle cx="12" cy="5" r="3" /><circle cx="5" cy="19" r="3" /><circle cx="19" cy="19" r="3" /><path d="m10.5 8-4 8m7-8 4 8M8 19h8" /></>,
    target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
    battle: <><path d="m5 4 15 15M19 4 4 19M3 6l3-3 3 3M15 6l3-3 3 3M3 18l3 3 3-3M15 18l3 3 3-3" /></>,
    timer: <><circle cx="12" cy="13" r="9" /><path d="M12 7v6l4 2M9 2h6" /></>,
    players: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5v1" /></>,
    level: <><path d="M12 22V4m-7 7 7-7 7 7M4 18h4m8 0h4" /></>,
    win: <><circle cx="12" cy="12" r="10" /><path d="m7 12 3 3 7-7" /></>,
    skin: <><path d="m8 3 4 2 4-2 5 4-3 4-2-1v11H8V10l-2 1-3-4 5-4Z" /></>,
    gadget: <><path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" /></>,
    super: <><path d="m12 2 2.8 6 6.6 1-4.7 4.7 1 6.6-5.7-3-5.7 3 1-6.6L2.6 9l6.6-1L12 2Z" /></>,
    hyper: <><path d="M13 2 5 13h6l-1 9 9-12h-6l1-8Z" /><path d="m3 4 2 2m15 13 2 2" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M10 2h4l1 3 2 1 3-1 2 4-2 2v2l2 2-2 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 2-2v-2L2 9l2-4 3 1 2-1 1-3Z" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15m6-12v15" /></>,
    chart: <><path d="M4 20V11m6 9V5m6 15v-8m5 8H2" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></>,
    gem: <><path d="M6 3h12l5 6-11 13L1 9l5-6ZM1 9h22M6 3l6 6 6-6m-6 6v13" /></>,
    coin: null,
    bling: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" /></>,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
    >
      {paths[kind]}
    </svg>
  );
}
