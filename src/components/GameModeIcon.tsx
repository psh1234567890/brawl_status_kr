import BrawlImage from "./BrawlImage";
import { getGameModeIconUrl, getGameModeIconUrlById } from "../utils/gameModeIcons";

/** Real game-mode artwork, only for names/IDs matched to the in-game catalog. */
export default function GameModeIcon({
  mode, modeId, size = 24,
}: {
  mode?: string | null;
  modeId?: number | null;
  size?: 20 | 24 | 32 | 40;
}) {
  const url = modeId == null ? getGameModeIconUrl(mode) : getGameModeIconUrlById(modeId);
  if (!url) return null;
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center">
      <BrawlImage
        src={url}
        alt=""
        width={size}
        height={size}
        sizes={size + "px"}
        fallbackText=""
        className="shrink-0 object-contain"
      />
    </span>
  );
}
