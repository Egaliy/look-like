export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Look Like</h1>
        <p className="text-white/60">Swipe-based Reference Review</p>
        <div className="mt-8 space-x-4">
          <a
            href="/admin"
            className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            Admin Panel
          </a>
        </div>
      </div>
    </div>
  );
}
