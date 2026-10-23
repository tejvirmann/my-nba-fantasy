export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-xl font-extrabold text-white">HL</div>
        <h1 className="text-2xl font-extrabold text-brand">Hoops League</h1>
        <p className="text-sm text-muted">Private fantasy basketball with Lock-In scoring</p>
      </div>
      <div className="card p-5">{children}</div>
    </main>
  );
}
