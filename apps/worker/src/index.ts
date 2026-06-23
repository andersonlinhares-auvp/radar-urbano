import { Worker } from 'bullmq';
import { connection, riskQueue, ingestionQueue } from './queues.js';
import { recomputeNeighborhoodRisk } from './jobs/recompute-risk.js';
import { runIngestion } from './jobs/ingest.js';
import { listAdapters } from '@radar-urbano/data-ingestion';

new Worker(
  'risk',
  async () => {
    const count = await recomputeNeighborhoodRisk();
    console.log(`Risk recomputado para ${count} bairros.`);
  },
  { connection },
);

new Worker(
  'ingestion',
  async (job) => {
    const data = (job.data ?? {}) as { adapterId?: string; params?: Record<string, unknown> };
    // Fallback: sem adapterId, apenas loga os adapters disponíveis (não roda ingestão).
    if (!data.adapterId) {
      const adapters = listAdapters();
      console.log(
        `Ingestão acionada (${job.name}) sem adapterId; adapters disponíveis: ${adapters
          .map((a) => a.id)
          .join(', ')}`,
      );
      return;
    }
    await runIngestion(data.adapterId, data.params);
  },
  { connection },
);

// Recalcula risco a cada hora.
await riskQueue.add('hourly', {}, { repeat: { every: 3600_000 } });

// Repeatable jobs de ingestão. Para evitar poluição em dev, só agenda quando
// INGESTION_ENABLED === 'true'. Facebook (best-effort) só com INGESTION_FACEBOOK === 'true'.
if (process.env.INGESTION_ENABLED === 'true') {
  const every = (min: number) => ({ repeat: { every: min * 60_000 } });
  // Fogo Cruzado só é agendado se houver credenciais (senão logaria erro a cada execução).
  if (process.env.FOGOCRUZADO_EMAIL && process.env.FOGOCRUZADO_PASSWORD) {
    await ingestionQueue.add('fogo-cruzado', { adapterId: 'fogo-cruzado' }, every(20));
    console.log('Fogo Cruzado agendado.');
  } else {
    console.log('Fogo Cruzado NÃO agendado (defina FOGOCRUZADO_EMAIL/PASSWORD).');
  }
  await ingestionQueue.add('g1-rio', { adapterId: 'g1-rio' }, every(60));
  await ingestionQueue.add('o-dia', { adapterId: 'o-dia' }, every(60));
  await ingestionQueue.add('extra', { adapterId: 'extra' }, every(60));
  if (process.env.INGESTION_FACEBOOK === 'true') {
    await ingestionQueue.add('ott-facebook', { adapterId: 'ott-facebook' }, every(60));
    await ingestionQueue.add('rio-de-nojeira', { adapterId: 'rio-de-nojeira' }, every(60));
  }
  console.log('Ingestão agendada ativada.');
} else {
  console.log('Ingestão agendada desativada (defina INGESTION_ENABLED=true para ativar).');
}

console.log('Worker Radar Urbano iniciado.');
