import { sql } from 'drizzle-orm';
import { db } from '@radar-urbano/db';
import { getAdapter, type NormalizedIncident, type RawRecord } from '@radar-urbano/data-ingestion';
import { computeTrustScore } from '@radar-urbano/core';
import { connection, riskQueue } from '../queues.js';

// Limites geográficos aproximados do município do Rio de Janeiro.
const RJ_BOUNDS = { latMin: -23.1, latMax: -22.6, lngMin: -43.8, lngMax: -43.0 };

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
// Prefixo das chaves de cache dos tiles (ver apps/web/.../api/tiles/[z]/[x]/[y]/route.ts).
const TILE_CACHE_PREFIX = 'tile:';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Gera ref code no mesmo padrão do app (RU-XXXX).
function generateRefCode(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `RU-${suffix}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Executa uma promise com timeout; rejeita se estourar o limite.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout (${ms}ms) em ${label}`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Retry com backoff exponencial (1s, 2s, 4s...). Relança o último erro se esgotar.
async function withRetry<T>(fn: () => Promise<T>, retries: number, label: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        const backoff = 1000 * 2 ** attempt;
        console.warn(
          `Falha em ${label} (tentativa ${attempt + 1}/${retries}); novo retry em ${backoff}ms.`,
        );
        await sleep(backoff);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// Invalida o cache Redis dos tiles via SCAN + DEL (não bloqueia o Redis).
async function invalidateTileCache(): Promise<void> {
  let cursor = '0';
  do {
    const [next, keys] = await connection.scan(
      cursor,
      'MATCH',
      `${TILE_CACHE_PREFIX}*`,
      'COUNT',
      100,
    );
    cursor = next;
    if (keys.length > 0) await connection.del(...keys);
  } while (cursor !== '0');
}

export async function runIngestion(
  adapterId: string,
  params?: Record<string, unknown>,
): Promise<{ fetched: number; upserted: number }> {
  // a. Registra a execução como RUNNING.
  const [logRow] = await db.execute<{ id: string }>(sql`
    INSERT INTO ingest_logs (adapter_id, status)
    VALUES (${adapterId}, 'RUNNING')
    RETURNING id
  `);
  const logId = logRow?.id ?? null;

  const markError = async (message: string) => {
    if (!logId) return;
    await db.execute(sql`
      UPDATE ingest_logs
      SET status = 'ERROR', error = ${message}, finished_at = now()
      WHERE id = ${logId}
    `);
  };

  try {
    const adapter = getAdapter(adapterId);

    // b. Busca com timeout + retry. Em falha final, registra ERROR e retorna (falha silenciosa).
    // Gazetteer de bairros (nome + ponto interno garantido) para adapters de texto.
    const gazetteer = await db.execute<{ id: string; name: string; lng: number; lat: number }>(sql`
      SELECT id, name,
             ST_X(ST_PointOnSurface(geom)) AS lng,
             ST_Y(ST_PointOnSurface(geom)) AS lat
      FROM neighborhoods
    `);
    const fetchParams = { ...(params ?? {}), neighborhoods: gazetteer };

    let raws: RawRecord[];
    try {
      raws = await withRetry(
        () => withTimeout(adapter.fetch(fetchParams), FETCH_TIMEOUT_MS, `fetch ${adapterId}`),
        MAX_RETRIES,
        `fetch ${adapterId}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Ingestão ${adapterId} falhou no fetch: ${message}`);
      await markError(message);
      return { fetched: 0, upserted: 0 };
    }

    const fetched = raws.length;

    // c. Resolve a source pela sourceKind do adapter.
    const [sourceRow] = await db.execute<{ id: string }>(sql`
      SELECT id FROM sources WHERE kind = ${adapter.sourceKind} LIMIT 1
    `);
    const sourceId = sourceRow?.id ?? null;
    if (!sourceId) {
      const message = `Nenhuma source cadastrada para kind=${adapter.sourceKind}`;
      console.error(`Ingestão ${adapterId}: ${message}`);
      await markError(message);
      return { fetched, upserted: 0 };
    }

    let upserted = 0;
    for (const raw of raws) {
      let normalized: NormalizedIncident;
      try {
        normalized = adapter.normalize(raw);
      } catch (err) {
        console.warn(`Ingestão ${adapterId}: registro ignorado (normalize falhou): ${String(err)}`);
        continue;
      }

      const { lng, lat } = normalized;
      // d. Valida coordenadas finitas e dentro do RJ; fora → pula (skip).
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      if (lat < RJ_BOUNDS.latMin || lat > RJ_BOUNDS.latMax) continue;
      if (lng < RJ_BOUNDS.lngMin || lng > RJ_BOUNDS.lngMax) continue;

      // trustScore: usa o do adapter (0–1) se veio, senão calcula. Persistido como inteiro 0–100.
      const trustScore =
        normalized.trustScore !== undefined
          ? Math.round(Math.max(0, Math.min(1, normalized.trustScore)) * 100)
          : computeTrustScore({
              sourceKind: adapter.sourceKind,
              confirms: 0,
              disputes: 0,
              authorReputation: 0,
              hasPhoto: false,
              hasVideo: false,
              recurrenceCount: 0,
            });

      // Status por fonte: Fogo Cruzado confirma; notícias/Facebook entram como PENDING.
      const status =
        normalized.status ?? (normalized.needsReview === false ? 'CONFIRMED' : 'PENDING');
      const refCode = generateRefCode();
      const point = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

      // e. Upsert por external_id. Enriquece neighborhood via ponto-em-polígono.
      await db.execute(sql`
        INSERT INTO incidents
          (ref_code, external_id, category_slug, source_id, title, description,
           location, neighborhood_id, occurred_at, status, trust_score, source_name, source_url)
        VALUES (
          ${refCode}, ${normalized.externalId}, ${normalized.categorySlug}, ${sourceId},
          ${normalized.title}, ${normalized.description ?? null},
          ${point},
          (SELECT id FROM neighborhoods WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)) LIMIT 1),
          ${normalized.occurredAt.toISOString()}, ${status}, ${trustScore},
          ${normalized.sourceLabel ?? null}, ${normalized.rawUrl ?? null}
        )
        ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET
          title = EXCLUDED.title,
          trust_score = EXCLUDED.trust_score,
          occurred_at = EXCLUDED.occurred_at,
          neighborhood_id = EXCLUDED.neighborhood_id,
          status = EXCLUDED.status,
          source_name = EXCLUDED.source_name,
          source_url = EXCLUDED.source_url
      `);
      upserted++;
    }

    // f. Recalcula risco e invalida cache de tiles apenas se houve upsert.
    if (upserted > 0) {
      await riskQueue.add('after-ingest', {});
      try {
        await invalidateTileCache();
      } catch (err) {
        console.warn(`Ingestão ${adapterId}: falha ao invalidar cache de tiles: ${String(err)}`);
      }
    }

    // g. Marca a execução como OK.
    if (logId) {
      await db.execute(sql`
        UPDATE ingest_logs
        SET status = 'OK', records_fetched = ${fetched}, records_upserted = ${upserted},
            finished_at = now()
        WHERE id = ${logId}
      `);
    }

    console.log(`Ingestão ${adapterId}: ${fetched} buscados, ${upserted} upserted.`);
    return { fetched, upserted };
  } catch (err) {
    // Falha silenciosa: registra ERROR e nunca relança (o worker não pode cair).
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Ingestão ${adapterId} falhou: ${message}`);
    await markError(message);
    return { fetched: 0, upserted: 0 };
  }
}
