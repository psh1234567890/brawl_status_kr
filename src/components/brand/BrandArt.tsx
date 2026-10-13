import Image from "next/image";
import styles from "./brand.module.css";

export function BrandCharacter({ id, className = "", silhouette = false, eager = false }: { id: number; className?: string; silhouette?: boolean; eager?: boolean }) {
  return <Image src={`https://cdn.brawlify.com/brawlers/model/${id}.png`} alt="" width={320} height={400} unoptimized loading={eager ? "eager" : "lazy"} className={`${styles.character} ${silhouette ? styles.silhouette : ""} ${className}`} />;
}

export function BrandArrow({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg>;
}

export function SearchIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>;
}
