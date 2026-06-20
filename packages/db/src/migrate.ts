import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não definido');

const migrationClient = postgres(url, { max: 1 });
const db = drizzle(migrationClient);

await db.execute('CREATE EXTENSION IF NOT EXISTS postgis;');
await migrate(db, { migrationsFolder: './migrations' });
await migrationClient.end();
console.log('Migrações aplicadas.');
