export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="av lg mx-auto mb-3" style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "none" }}>DS</div>
        <h1 className="text-2xl font-medium">DS Hoops League</h1>
        <p className="text-sm text-muted">Private fantasy basketball with Lock-In scoring</p>
      </div>
      <div className="card pad">{children}</div>
    </main>
  );
}
