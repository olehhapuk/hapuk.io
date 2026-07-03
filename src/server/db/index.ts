import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';
import * as schema from './schema';

/**
 * Single shared postgres.js connection + Drizzle client.
 * Reuse across hot reloads in dev to avoid exhausting connections.
 */
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client = globalForDb.client ?? postgres(env.DATABASE_URL);
if (process.env.NODE_ENV !== 'production') globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema };
