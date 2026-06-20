import { topNeighborhoodRisk } from '@/lib/risk';

export const dynamic = 'force-dynamic';

export default async function PainelPage() {
  const ranking = await topNeighborhoodRisk();
  return (
    <main className="mx-auto max-w-4xl p-10">
      <h1 className="font-serif text-3xl">Panorama de risco urbano</h1>
      <ul className="mt-6 divide-y divide-linha">
        {ranking.map((n) => (
          <li key={n.name} className="flex items-center justify-between py-3">
            <span>{n.name}</span>
            <span className="flex items-center gap-3 font-mono">
              <span className="h-2 w-24 rounded bg-linha">
                <span
                  className="block h-2 rounded"
                  style={{ width: `${n.score}%`, background: n.color }}
                />
              </span>
              <span style={{ color: n.color }}>{n.score}</span>
              <span className="text-ardosia">{n.band}</span>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
