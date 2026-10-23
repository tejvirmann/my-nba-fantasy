import Link from "next/link";

/** Green ESPN-style title bar used on every page outside a league. */
export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="hdr">
      <Link href="/" className="logo" aria-label="All leagues">HL</Link>
      <div className="ttl">
        {title}
        {subtitle ? <small>{subtitle}</small> : null}
      </div>
      {right ? <div className="right">{right}</div> : null}
    </header>
  );
}
