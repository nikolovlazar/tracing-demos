import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create a PostgreSQL client
const connectionString =
  process.env.DB_URL ||
  'postgres://delivery_user:delivery_password@postgres:5432/delivery_db';
const client = new Pool({
  connectionString,
});

// Create a Drizzle ORM instance
export const db = drizzle({ client, schema });

// Export the schema
export { schema };
