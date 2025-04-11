import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString =
  process.env.DB_URL ||
  'postgres://kitchen_user:kitchen_password@postgres:5432/kitchen';

// Create the PostgreSQL client
const client = new Pool({
  connectionString,
});

// Create the Drizzle ORM instance
export const db = drizzle({ client, schema });

// Export the schema
export { schema };
