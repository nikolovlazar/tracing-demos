import './instrument';

import { KitchenController } from './controllers/kitchen.controller';
import { PostgresKitchenRepository } from './repositories/postgres-kitchen.repository';
import { registerWithConsul } from './config/consul';
import { initializeRabbitMQ, subscribeToOrderEvents } from './config/rabbitmq';
import { OrderEventService } from './services/order-event.service';
import { runMigrations } from './db/migrate';

async function startService() {
  try {
    await runMigrations();
    await registerWithConsul();
    await initializeRabbitMQ();

    const kitchenRepository = new PostgresKitchenRepository();
    const kitchenController = new KitchenController(kitchenRepository);
    const orderEventService = new OrderEventService(kitchenRepository);

    // Subscribe to order events
    await subscribeToOrderEvents(async (event) => {
      if (event.key === 'order.ready_for_kitchen') {
        await orderEventService.handleOrderReadyForKitchen(event);
      }
    });

    const server = Bun.serve({
      port: Number(process.env.PORT) || 8082,
      async fetch(req) {
        const url = new URL(req.url);

        // GET /kitchen/orders
        if (url.pathname === '/kitchen/orders' && req.method === 'GET') {
          return await kitchenController.getKitchenOrders(req);
        }

        // GET /health
        if (url.pathname === '/health') {
          return new Response('OK', { status: 200 });
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    console.log(`Kitchen service listening on port ${server.port}`);
  } catch (error) {
    console.error('Failed to start kitchen service:', error);
    process.exit(1);
  }
}

startService();
