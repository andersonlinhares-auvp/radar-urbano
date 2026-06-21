import { redis } from './redis.js';

/** Decisão pura: o contador (já incrementado) está dentro do limite? */
export function allow(count: number, limit: number): boolean {
  return count <= limit;
}

/** Janela fixa por chave. Retorna true se a requisição é permitida. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const k = `rl:${key}`;
  const count = await redis.incr(k);
  if (count === 1) await redis.expire(k, windowSec);
  return allow(count, limit);
}
