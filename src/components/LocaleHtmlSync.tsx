"use client";

import { useEffect } from "react";
import type { Locale } from "../i18n/config";

export default function LocaleHtmlSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "ko";
    };
  }, [locale]);

  return null;
}
