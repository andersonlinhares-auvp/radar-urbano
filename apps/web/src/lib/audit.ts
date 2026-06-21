import { db, accessLogs } from '@radar-urbano/db';

export async function logAccess(
  action: string,
  opts: { userId?: string; meta?: unknown; ip?: string } = {},
): Promise<void> {
  await db.insert(accessLogs).values({
    action,
    userId: opts.userId ?? null,
    meta: (opts.meta as object) ?? null,
    ip: opts.ip ?? null,
  });
}
