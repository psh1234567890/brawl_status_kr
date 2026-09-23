"use client";

import { useEffect } from "react";
import { numberLocales, type Locale } from "../i18n/config";

export default function LocaleHtmlSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = numberLocales[locale];
    return () => {
      document.documentElement.lang = numberLocales.ko;
    };
  }, [locale]);

  return null;
}
