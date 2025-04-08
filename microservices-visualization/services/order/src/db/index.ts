import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database connection string from environment variables
const connectionString =
  process.env.DB_URL ||
  'postgres://orders_user:orders_password@postgres:5432/orders';

// Create a PostgreSQL client
const client = postgres(connectionString);

// Create a Drizzle ORM instance
export const db = drizzle(client, { schema });

// Export schema for use in other files
export { schema };
