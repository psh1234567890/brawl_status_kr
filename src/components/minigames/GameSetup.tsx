import type { ReactNode } from "react";
import { BrandCharacter } from "../brand/BrandArt";
import styles from "./game.module.css";

export default function GameSetup({ children, character, tone = "purple", silhouette = false }: {
  children: ReactNode;
  character: number;
  tone?: "purple" | "yellow" | "green" | "coral" | "lilac" | "blue";
  silhouette?: boolean;
}) {
  return <div className={styles.setup}>
    <div className={`${styles.art} ${styles[tone]}`} aria-hidden="true">
      <BrandCharacter id={character} silhouette={silhouette} eager />
    </div>
    <div className={styles.setupContent}>{children}</div>
  </div>;
}
