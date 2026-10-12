import { getRankedLeagueIconUrl } from "../utils/brawlAssets";
import BrawlImage from "./BrawlImage";

/** Uses game art only when the rank label from the API is recognized.
 * Name and Elo stay readable even if the external asset is unavailable. */
export default function RankedLeagueIcon({ rankName, className = "h-10 w-10" }: {
  rankName?: string | null;
  className?: string;
}) {
  const imageUrl = getRankedLeagueIconUrl(rankName);
  if (!imageUrl) return null;
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <BrawlImage
        src={imageUrl}
        alt=""
        width={64}
        height={64}
        className="h-full w-full object-contain"
        sizes="64px"
        fallbackText=""
      />
    </span>
  );
}
