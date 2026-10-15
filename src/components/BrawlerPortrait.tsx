import type { ComponentProps } from "react";
import type { BrawlifyBrawler } from "../types/brawlify";
import { getBrawlerPortraitSources } from "../utils/brawlAssets";
import BrawlImage from "./BrawlImage";

type PortraitProps = Omit<ComponentProps<typeof BrawlImage>, "src" | "fallbackSrcs" | "fallbackText" | "fallbackContent"> & {
  brawler: Pick<BrawlifyBrawler, "id" | "imageUrl" | "imageUrl2" | "avatarId">;
};
export default function BrawlerPortrait({ brawler, ...props }: PortraitProps) {
  const sources = getBrawlerPortraitSources(brawler);
  return <BrawlImage {...props} src={sources[0]} fallbackSrcs={sources.slice(1)} fallbackContent={
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-full w-full max-h-32 max-w-32 p-2">
      <path d="m32 4 8 8 11 1 1 11 8 8-8 8-1 11-11 1-8 8-8-8-11-1-1-11-8-8 8-8 1-11 11-1Z" fill="#ffdc62" />
      <path d="M22 44v-5a10 10 0 0 1 20 0v5" fill="#5842ce" />
      <circle cx="32" cy="25" r="8" fill="#5842ce" />
      <path d="m47 18 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="#5842ce" />
    </svg>
  } />;
}
