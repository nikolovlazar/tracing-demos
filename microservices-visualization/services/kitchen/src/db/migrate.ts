import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index';
import { seedDatabase } from './seed';

export async function runMigrations() {
  console.log('Running migrations...');

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully');

    // Run seed after successful migration
    await seedDatabase();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations();
}
