import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';

export interface LandingStats {
  neighborhoods: number | null;
  reportsThisMonth: number | null;
  community: number | null;
}

/**
 * Números reais para a seção "Comunidade" da landing.
 * Tolerante a falhas: se o banco estiver indisponível/vazio, retorna null
 * (a UI mostra um traço em vez de quebrar a página pública).
 */
export async function getLandingStats(): Promise<LandingStats> {
  try {
    const [row] = await db.execute<{
      neighborhoods: number;
      reports_month: number;
      community: number;
    }>(sql`
      SELECT
        (SELECT count(*) FROM neighborhoods) AS neighborhoods,
        (SELECT count(*) FROM incidents WHERE occurred_at > now() - interval '30 days') AS reports_month,
        (SELECT count(*) FROM users) AS community
    `);
    return {
      neighborhoods: Number(row?.neighborhoods ?? 0),
      reportsThisMonth: Number(row?.reports_month ?? 0),
      community: Number(row?.community ?? 0),
    };
  } catch {
    return { neighborhoods: null, reportsThisMonth: null, community: null };
  }
}
