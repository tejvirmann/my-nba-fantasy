import Link from "next/link";

export const metadata = { title: "Install · Hoops League" };

const STEPS = {
  iphone: [
    "Open this site in Safari (it must be Safari, not Chrome, on iPhone).",
    "Tap the Share button at the bottom of the screen.",
    "Scroll down and tap “Add to Home Screen”.",
    "Tap Add. The Hoops League icon now sits on your home screen and opens full-screen like an app.",
  ],
  android: [
    "Open this site in Chrome.",
    "Tap the ⋮ menu, then “Install app” (or “Add to Home screen”).",
    "Confirm. It appears in your app drawer and opens full-screen.",
  ],
  desktop: [
    "In Chrome or Edge, click the install icon at the right end of the address bar.",
    "Click Install. It opens in its own window and can live in your dock or taskbar.",
  ],
};

export default function InstallPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Link href="/" className="text-sm text-brand-2">← Back</Link>
      <h1 className="mb-1 mt-2 text-2xl font-extrabold text-brand">Install Hoops League</h1>
      <p className="mb-5 text-sm text-muted">No App Store needed. The site installs like an app: its own icon, full-screen, and updates arrive automatically.</p>
      {(Object.entries(STEPS) as [keyof typeof STEPS, string[]][]).map(([k, steps]) => (
        <section key={k} className="card mb-3 p-4">
          <h2 className="mb-2 font-bold capitalize">{k === "iphone" ? "iPhone / iPad" : k}</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {steps.map((s) => (<li key={s}>{s}</li>))}
          </ol>
        </section>
      ))}
      <p className="text-xs text-muted">Updates: when we deploy a new version, the installed app picks it up the next time you open it.</p>
    </main>
  );
}
