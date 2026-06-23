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

// Repeatable jobs de ingestão (Fase 1). Os adapters ainda retornam [] (stubs honestos),
// então o agendamento é inócuo, mas deixa o pipeline pronto. Para evitar poluição em dev,
// só agenda quando INGESTION_ENABLED === 'true'.
if (process.env.INGESTION_ENABLED === 'true') {
  // Fontes oficiais/diárias às 06:00 (horário do servidor).
  await ingestionQueue.add('isp-rj', { adapterId: 'isp-rj' }, { repeat: { pattern: '0 6 * * *' } });
  await ingestionQueue.add(
    'data-rio',
    { adapterId: 'data-rio' },
    { repeat: { pattern: '0 6 * * *' } },
  );
  // Recortes territoriais mudam raramente: semanal (domingo 03:00).
  await ingestionQueue.add('ibge', { adapterId: 'ibge' }, { repeat: { pattern: '0 3 * * 0' } });
  await ingestionQueue.add('osm', { adapterId: 'osm' }, { repeat: { pattern: '0 4 * * 0' } });
  console.log('Repeatable jobs de ingestão agendados (INGESTION_ENABLED=true).');
} else {
  console.log('Ingestão agendada desativada (defina INGESTION_ENABLED=true para ativar).');
}

console.log('Worker Radar Urbano iniciado.');
