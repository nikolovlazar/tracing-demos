import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DB_URL ||
  'postgres://inventory_user:inventory_password@postgres:5432/inventory';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
