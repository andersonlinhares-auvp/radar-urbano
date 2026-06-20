import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';
import { riskBand, RISK_BAND_COLOR, type RiskBand } from '@radar-urbano/core';

export interface NeighborhoodRisk {
  name: string;
  score: number;
  band: RiskBand;
  color: string;
}

interface RiskRow extends Record<string, unknown> {
  name: string;
  score: number;
}

export async function topNeighborhoodRisk(limit = 10): Promise<NeighborhoodRisk[]> {
  const rows = await db.execute<RiskRow>(sql`
    SELECT DISTINCT ON (rs.ref_id) n.name AS name, rs.score AS score
    FROM risk_scores rs
    JOIN neighborhoods n ON n.id::text = rs.ref_id
    WHERE rs.scope = 'NEIGHBORHOOD'
    ORDER BY rs.ref_id, rs.computed_at DESC
  `);
  return rows
    .map((r) => {
      const score = Number(r.score);
      const band = riskBand(score);
      return { name: String(r.name), score, band, color: RISK_BAND_COLOR[band] };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
