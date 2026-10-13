import type { ReactNode } from "react";
import type { Locale } from "../i18n/config";
import AdSenseUnit from "./AdSenseUnit";
import StatSymbol from "./StatSymbol";
import type { StatSymbolKind } from "./StatSymbol";
import BrandHeader from "./brand/BrandHeader";
import BrandFooter from "./brand/BrandFooter";
import styles from "./brand/brand.module.css";

interface PortalLayoutProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  locale?: Locale;
}


export default function PortalLayout({ title, description, children, actions, locale = "ko" }: PortalLayoutProps) {
  return <div className={styles.page} lang={locale}>
    <BrandHeader locale={locale} />
    <main className={styles.portalMain}>
      <div className={styles.portalHeading}>
        <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
        {actions && <div className={styles.portalActions}>{actions}</div>}
      </div>
      <AdSlot />
      {children}
    </main>
    <BrandFooter locale={locale} />
  </div>;
}

export function StatPill({ label, value, icon }: { label: string; value: string | number; icon?: StatSymbolKind }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.06em] text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xl font-black text-blue-700">
        {icon ? <StatSymbol kind={icon} size={19} /> : null}
        {value}
      </p>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

export function AdSlot() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;
  if (clientId && slotId) {
    return (
      <aside>
        <AdSenseUnit clientId={clientId} slotId={slotId} />
      </aside>
    );
  }

  return null;
}
