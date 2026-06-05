export default function AdminDashboard() {
  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage matches, markets, odds, and users
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-300 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Matches
          </h2>
          <p className="mt-2 text-2xl font-bold text-zinc-900">104</p>
          <p className="text-xs text-zinc-400">Total tournament matches</p>
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Markets
          </h2>
          <p className="mt-2 text-2xl font-bold text-zinc-900">--</p>
          <p className="text-xs text-zinc-400">Manage odds &amp; locking</p>
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Users
          </h2>
          <p className="mt-2 text-2xl font-bold text-zinc-900">--</p>
          <p className="text-xs text-zinc-400">Registered accounts</p>
        </div>
      </div>
    </>
  );
}
