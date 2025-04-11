import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Get database connection string from environment variables
const connectionString =
  process.env.DB_URL ||
  'postgres://orders_user:orders_password@postgres:5432/orders';

// Create a PostgreSQL client
const client = new Pool({
  connectionString,
});

// Create a Drizzle ORM instance
export const db = drizzle({ client, schema });

// Export schema for use in other files
export { schema };
