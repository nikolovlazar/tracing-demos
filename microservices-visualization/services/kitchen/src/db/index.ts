import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DB_URL ||
  'postgres://kitchen_user:kitchen_password@postgres:5432/kitchen';

// Create the PostgreSQL client
const client = postgres(connectionString);

// Create the Drizzle ORM instance
export const db = drizzle(client, { schema });

// Export the schema
export { schema };
