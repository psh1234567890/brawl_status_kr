import type { Metadata } from "next";
import ComparisonGamePage from "../../../components/minigames/ComparisonGamePage";
import { getMiniGameMetadata } from "../../../utils/minigames/metadata";

export const revalidate = 3600;
export const metadata: Metadata = getMiniGameMetadata("ko", "release-order");
export default function Page() { return <ComparisonGamePage locale="ko" kind="release-order" />; }
