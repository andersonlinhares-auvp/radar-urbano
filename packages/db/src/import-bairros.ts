import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sql } from 'drizzle-orm';
import { db } from './client.js';

// Importa os bairros oficiais do Rio a partir do GeoJSON commitado.
// Idempotente: trunca e recria tudo a cada execução.

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    nome: string;
    regiao_adm: string;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // 1. Limpa todos os dados existentes (demo ou reais anteriores).
  await db.execute(
    sql`TRUNCATE TABLE risk_scores, incidents, neighborhoods, regions RESTART IDENTITY CASCADE`,
  );

  // 2. Insere a região pai (geom NULL — abrange o município inteiro).
  const [region] = await db.execute<{ id: string }>(sql`
    INSERT INTO regions (name, geom)
    VALUES ('Município do Rio de Janeiro', NULL)
    RETURNING id
  `);
  const regionId = region!.id;

  // 3. Lê o GeoJSON e insere cada bairro.
  const geojsonPath = join(__dirname, '..', 'data', 'bairros-rio.geojson');
  const raw = readFileSync(geojsonPath, 'utf-8');
  const collection = JSON.parse(raw) as GeoJSONCollection;

  let count = 0;
  for (const feature of collection.features) {
    const name = feature.properties.nome.trim();
    const geomJson = JSON.stringify(feature.geometry);

    await db.execute(sql`
      INSERT INTO neighborhoods (region_id, name, geom)
      VALUES (
        ${regionId},
        ${name},
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geomJson}), 4326))
      )
    `);
    count++;
  }

  console.log(`Importados ${count} bairros.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
