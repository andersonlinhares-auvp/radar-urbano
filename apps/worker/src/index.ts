import { Worker } from 'bullmq';
import { connection, riskQueue } from './queues.js';
import { recomputeNeighborhoodRisk } from './jobs/recompute-risk.js';
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
    const adapters = listAdapters();
    console.log(
      `Ingestão acionada (${job.name}); adapters disponíveis: ${adapters.map((a) => a.id).join(', ')}`,
    );
  },
  { connection },
);

// Recalcula risco a cada hora.
await riskQueue.add('hourly', {}, { repeat: { every: 3600_000 } });
console.log('Worker Radar Urbano iniciado.');
