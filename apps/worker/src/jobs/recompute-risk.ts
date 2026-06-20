import { sql } from 'drizzle-orm';
import { db, riskScores } from '@radar-urbano/db';
import { aggregateRisk, normalizeRisk, type RiskInput } from '@radar-urbano/core';

export async function recomputeNeighborhoodRisk(windowDays = 30): Promise<number> {
  const rows = await db.execute(sql`
    SELECT n.id AS neighborhood_id,
           c.risk_weight AS category_weight,
           i.trust_score AS trust_score,
           EXTRACT(EPOCH FROM (now() - i.occurred_at)) / 86400 AS age_days
    FROM incidents i
    JOIN incident_categories c ON c.slug = i.category_slug
    JOIN neighborhoods n ON n.id = i.neighborhood_id
    WHERE i.occurred_at > now() - (${windowDays} || ' days')::interval
  `);

  const byNeighborhood = new Map<string, RiskInput[]>();
  for (const r of rows) {
    const key = String(r.neighborhood_id);
    const list = byNeighborhood.get(key) ?? [];
    list.push({
      categoryWeight: Number(r.category_weight),
      trustScore: Number(r.trust_score),
      ageDays: Number(r.age_days),
    });
    byNeighborhood.set(key, list);
  }

  const raw = [...byNeighborhood.entries()].map(([id, items]) => ({
    id,
    value: aggregateRisk(items, 1),
  }));
  const cityMax = Math.max(1, ...raw.map((r) => r.value));
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 86400_000);

  for (const r of raw) {
    await db.insert(riskScores).values({
      scope: 'NEIGHBORHOOD',
      refId: r.id,
      windowStart,
      windowEnd: now,
      score: normalizeRisk(r.value, cityMax),
    });
  }
  return raw.length;
}
