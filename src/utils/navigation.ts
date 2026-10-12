import { stripLocalePrefix } from "../i18n/config";

/** Match the section without highlighting similarly prefixed siblings. */
export function isActiveNavigationItem(pathname: string, href: string): boolean {
  const current = stripLocalePrefix(pathname).replace(/\/+$/, "") || "/";
  const target = href.replace(/\/+$/, "") || "/";
  return current === target || (target !== "/" && current.startsWith(`${target}/`));
}
