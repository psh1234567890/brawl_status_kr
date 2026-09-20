import Link from "next/link";
import type { ReactNode } from "react";
import { localizedHref, type Locale } from "../i18n/config";
import {
  getDocumentPageMessages,
  type DocumentPageMessages,
} from "../i18n/documentPageMessages";
import LanguageSwitcher from "./LanguageSwitcher";
import PortalLayout from "./PortalLayout";

const contactEmail = "seunghunbag76@gmail.com";

type DocumentKey = keyof DocumentPageMessages;
type PageCopy = DocumentPageMessages[DocumentKey];
type Section = PageCopy["sections"][number];
type Block = Section["blocks"][number];

export function DocumentArticlePage({
  locale,
  pageKey,
}: {
  locale: Locale;
  pageKey: Exclude<DocumentKey, "methodology">;
}) {
  const copy = getDocumentPageMessages(locale)[pageKey];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10 text-gray-800">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={localizedHref(locale, "/")}
            className="text-sm font-black text-indigo-600 hover:underline"
          >
            {copy.back}
          </Link>
          <LanguageSwitcher locale={locale} />
        </div>

        <h1 className="mt-6 text-3xl font-black text-indigo-950 sm:text-4xl">{copy.title}</h1>
        {copy.effectiveDate ? (
          <p className="mt-3 text-sm font-bold text-gray-500">{copy.effectiveDate}</p>
        ) : null}
        {copy.intro ? (
          <p className="mt-4 font-semibold leading-7 text-gray-700">{copy.intro}</p>
        ) : null}

        {copy.sections.map((section, index) => {
          const highlighted =
            (pageKey === "about" && index === copy.sections.length - 1) ||
            (pageKey === "contact" && index === 0);

          return (
            <section
              key={`${section.title}-${index}`}
              className={
                highlighted
                  ? "mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-5"
                  : "mt-8"
              }
            >
              <h2 className="text-xl font-black text-indigo-900">{section.title}</h2>
              <DocumentBlocks blocks={section.blocks} />
            </section>
          );
        })}
      </article>
    </main>
  );
}

export function MethodologyDocumentPage({ locale }: { locale: Locale }) {
  const copy = getDocumentPageMessages(locale).methodology;

  return (
    <PortalLayout
      locale={locale}
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.description}
    >
      {copy.sections.map((section, index) => {
        const hasAction = section.blocks.some((block) => block.type === "action");
        return (
          <section
            key={`${section.title}-${index}`}
            className={
              hasAction
                ? "rounded-lg border border-indigo-100 bg-indigo-50 p-5"
                : "rounded-lg border border-white bg-white p-5 shadow-sm"
            }
          >
            <h2 className="text-xl font-black text-indigo-950">{section.title}</h2>
            <DocumentBlocks blocks={section.blocks} compact />
          </section>
        );
      })}
    </PortalLayout>
  );
}

export function DocumentBlocks({
  blocks,
  compact = false,
}: {
  blocks: readonly Block[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-3 text-sm font-semibold leading-7 text-gray-600" : "mt-3 font-semibold leading-7 text-gray-700"}>
      {blocks.map((block, index) => (
        <DocumentBlockView key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}

function DocumentBlockView({ block }: { block: Block }) {
  if (block.type === "list") {
    return (
      <ul className="list-disc space-y-2 pl-5">
        {block.items.map((item) => (
          <li key={item}>{renderEmailPlaceholder(item)}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "action") {
    return (
      <Link
        href="https://github.com/psh1234567890/brawl_status_kr/issues"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white hover:bg-indigo-800"
      >
        {block.label}
      </Link>
    );
  }

  return <p className="mt-3 first:mt-0">{renderEmailPlaceholder(block.text)}</p>;
}

function renderEmailPlaceholder(text: string): ReactNode {
  if (!text.includes("{email}")) return text;
  const [before, after] = text.split("{email}");
  return (
    <>
      {before}
      <a
        href={`mailto:${contactEmail}`}
        className="font-black text-indigo-700 hover:underline"
      >
        {contactEmail}
      </a>
      {after}
    </>
  );
}
