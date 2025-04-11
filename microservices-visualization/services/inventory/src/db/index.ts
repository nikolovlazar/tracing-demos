import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString =
  process.env.DB_URL ||
  'postgres://inventory_user:inventory_password@postgres:5432/inventory';

const client = new Pool({
  connectionString,
});
export const db = drizzle({ client, schema });
