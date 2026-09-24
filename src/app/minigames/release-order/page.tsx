import type { Metadata } from "next";
import UnavailableGame from "../../../components/minigames/UnavailableGame";
import { getMiniGameMetadata } from "../../../utils/minigames/metadata";

export const revalidate = 3600;
export const metadata: Metadata = getMiniGameMetadata("ko", "release-order");
export default function Page() { return <UnavailableGame locale="ko" id="release-order" />; }
