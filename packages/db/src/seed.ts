import { CATEGORIES } from '@radar-urbano/core';
import { db } from './client.js';
import { incidentCategories, sources } from './schema.js';

await db
  .insert(incidentCategories)
  .values(
    CATEGORIES.map((c) => ({
      slug: c.slug,
      label: c.label,
      group: c.group,
      icon: c.icon,
      color: c.color,
      riskWeight: c.riskWeight,
      description: c.description,
    })),
  )
  .onConflictDoNothing();

await db
  .insert(sources)
  .values([
    { kind: 'COMMUNITY', name: 'Comunidade', baseTrust: 0.4 },
    { kind: 'OFFICIAL', name: 'ISP-RJ', baseTrust: 1.0, url: 'https://www.isp.rj.gov.br' },
    { kind: 'NEWS', name: 'Imprensa', baseTrust: 0.6 },
  ])
  .onConflictDoNothing();

console.log('Seed concluído.');
process.exit(0);
