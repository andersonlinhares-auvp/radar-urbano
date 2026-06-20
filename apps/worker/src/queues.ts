import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
export const riskQueue = new Queue('risk', { connection });
export const ingestionQueue = new Queue('ingestion', { connection });
