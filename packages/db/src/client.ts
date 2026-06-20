import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// postgres-js conecta de forma preguiçosa (apenas na primeira query), então
// construir o cliente no import é seguro em build-time (nenhuma conexão é aberta).
// O DATABASE_URL real é lido em runtime; no `next build` um placeholder basta.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL não definido');

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
