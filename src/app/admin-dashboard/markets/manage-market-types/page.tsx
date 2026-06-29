import { prisma } from '@/lib/prisma';

export default async function ManageMarketTypesPage() {
  const types = await prisma.typesOfMarkets.findMany({
    orderBy: { shortName: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Manage Market Types</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {types.length} market type{types.length !== 1 && 's'} configured
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Short Name</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t, i) => (
              <tr
                key={t.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
              >
                <td className="px-4 py-3 text-xs text-zinc-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-700">
                    {t.shortName}
                  </code>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-800">{t.name}</td>
                <td className="px-4 py-3 text-zinc-500">{t.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
