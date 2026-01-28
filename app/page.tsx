export default function Home() {
  return (
    <div className="min-h-screen w-full bg-black">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-white">Look Like</h1>
          <p className="text-white/60">Swipe-based Reference Review</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="/admin"
              className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              Admin Panel
            </a>
            <a
              href="/test"
              className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              Test Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
