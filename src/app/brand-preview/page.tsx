import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrawlBrandPreview from "../../components/brand-preview/BrawlBrandPreview";

export const metadata: Metadata = {
  title: { absolute: "Brand preview" },
  robots: { index: false, follow: false },
};

export default function BrandPreviewPage() {
  if (process.env.BRAND_PREVIEW_ENABLED !== "1") notFound();
  return <BrawlBrandPreview />;
}
