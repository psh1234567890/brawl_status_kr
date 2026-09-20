import type { Metadata } from "next";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { localeAlternates } from "../../i18n/config";

const koCopy = getCatalogPageMessages("ko").skins.metadata;

export const metadata: Metadata = {
  title: koCopy.title,
  description: koCopy.description,
  alternates: {
    canonical: "/skins",
    languages: localeAlternates("/skins"),
  },
  openGraph: {
    title: `${koCopy.title} | Brawl Status KR`,
    description: koCopy.description,
    url: "/skins",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${koCopy.title} | Brawl Status KR`,
    description: koCopy.description,
  },
};

export default function SkinsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
