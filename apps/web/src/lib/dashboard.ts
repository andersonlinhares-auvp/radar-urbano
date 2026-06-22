import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';

export interface DashboardStats {
  incidents24h: number;
  verifiedPct: number;
  criticalAlerts: number;
  neighborhoodsActive24h: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [row] = await db.execute<{
    incidents_24h: number;
    verified: number;
    total: number;
    critical: number;
    neighborhoods_active: number;
  }>(sql`
    SELECT
      (SELECT count(*) FROM incidents WHERE occurred_at > now() - interval '24 hours') AS incidents_24h,
      (SELECT count(*) FROM incidents WHERE occurred_at > now() - interval '24 hours' AND status = 'CONFIRMED') AS verified,
      (SELECT count(*) FROM incidents WHERE occurred_at > now() - interval '24 hours') AS total,
      (SELECT count(*) FROM incidents i JOIN incident_categories c ON c.slug = i.category_slug
        WHERE i.occurred_at > now() - interval '24 hours' AND c.group = 'violencia_armada') AS critical,
      (SELECT count(DISTINCT neighborhood_id) FROM incidents
        WHERE occurred_at > now() - interval '24 hours' AND neighborhood_id IS NOT NULL) AS neighborhoods_active
  `);
  const total = Number(row?.total ?? 0);
  const verified = Number(row?.verified ?? 0);
  return {
    incidents24h: Number(row?.incidents_24h ?? 0),
    verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
    criticalAlerts: Number(row?.critical ?? 0),
    neighborhoodsActive24h: Number(row?.neighborhoods_active ?? 0),
  };
}

export interface HourBucket {
  hour: string; // 'HH:00'
  count: number;
}

export async function incidentsByHour(hours = 12): Promise<HourBucket[]> {
  const rows = await db.execute<{ bucket: string; count: number }>(sql`
    WITH series AS (
      SELECT generate_series(
        date_trunc('hour', now()) - make_interval(hours => ${hours - 1}),
        date_trunc('hour', now()),
        interval '1 hour'
      ) AS h
    )
    SELECT to_char(series.h, 'HH24:00') AS bucket,
           count(i.id) AS count
    FROM series
    LEFT JOIN incidents i
      ON date_trunc('hour', i.occurred_at) = series.h
    GROUP BY series.h
    ORDER BY series.h
  `);
  return rows.map((r) => ({ hour: String(r.bucket), count: Number(r.count) }));
}
