import { serve } from 'bun';
import { KitchenController } from './controllers/kitchen.controller';
import { PostgresKitchenRepository } from './repositories/postgres-kitchen.repository';
import { registerWithConsul } from './config/consul';
import { initializeRabbitMQ, subscribeToOrderEvents } from './config/rabbitmq';
import { OrderEventService } from './services/order-event.service';
import { runMigrations } from './db/migrate';

async function startService() {
  // Run migrations first
  await runMigrations();

  const kitchenRepository = new PostgresKitchenRepository();
  const kitchenController = new KitchenController(kitchenRepository);
  const orderEventService = new OrderEventService(kitchenRepository);

  // Register with Consul and initialize RabbitMQ
  await registerWithConsul();
  await initializeRabbitMQ();

  // Subscribe to order events
  await subscribeToOrderEvents(async (event) => {
    if (event.key === 'order.ready_for_kitchen') {
      await orderEventService.handleOrderReadyForKitchen(event);
    }
  });

  const server = serve({
    port: Number(process.env.PORT) || 8082,
    routes: {
      '/kitchen/orders': {
        GET: (req) => kitchenController.getKitchenOrders(req),
      },
      '/kitchen/orders/:id': {
        GET: (req, params) =>
          kitchenController.getKitchenOrder(req, Number(params.id)),
      },
      '/kitchen/orders/:id/items/:itemId/status': {
        PUT: (req, params) => {
          // Extract parameters from the URL
          const url = new URL(req.url);
          const pathParts = url.pathname.split('/');
          const id = Number(pathParts[3]);
          const itemId = Number(pathParts[5]);

          return kitchenController.updateItemStatus(req, id, itemId);
        },
      },
      '/health': new Response('OK', { status: 200 }),
    },
  });

  console.log(`Kitchen service listening on port ${server.port}`);
}

startService().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});
