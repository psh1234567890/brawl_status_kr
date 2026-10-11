import Link from "next/link";
import type { Locale } from "../i18n/config";
import { localizedHref } from "../i18n/config";
import { searchTagNoticeMessages } from "../i18n/searchTagNoticeMessages";

export default function SearchTagNotice({ locale }: { locale: Locale }) {
  const copy = searchTagNoticeMessages[locale];
  return (
    <aside className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
      <p className="text-xs font-bold">{copy.title}</p>
      <p className="mt-1 text-xs leading-5">{copy.notice}{" "}
        <Link href={localizedHref(locale, "/privacy")} className="font-bold text-blue-700 underline">
          Privacy
        </Link>
      </p>
    </aside>
  );
}
