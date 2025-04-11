import './instrument';

import { PostgresInventoryRepository } from './repositories/postgres-inventory.repository';
import { InventoryController } from './controllers/inventory.controller';
import { initializeRabbitMQ, subscribeToOrderEvents } from './config/rabbitmq';
import { registerWithConsul } from './config/consul';
import { OrderEventService } from './services/order-event.service';
import { runMigrations } from './db/migrate';
import type { NewInventoryItem } from './db/schema';

async function startService() {
  // Run migrations first
  await runMigrations();

  const repository = new PostgresInventoryRepository();
  const controller = new InventoryController(repository);
  const orderEventService = new OrderEventService(repository);

  await registerWithConsul();
  await initializeRabbitMQ();

  // Subscribe to order events
  await subscribeToOrderEvents(async (event) => {
    if (event.key === 'order.created') {
      await orderEventService.handleOrderCreated(event);
    }
  });

  const server = Bun.serve({
    port: Number(process.env.PORT) || 8081,
    async fetch(req) {
      const url = new URL(req.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response('OK', { status: 200 });
      }

      return new Response('Not found', { status: 404 });
    },
  });

  console.log(`Inventory service listening on port ${server.port}`);
}

startService().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});
