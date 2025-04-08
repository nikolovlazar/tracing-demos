import { serve } from 'bun';
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

  const server = serve({
    port: Number(process.env.PORT) || 8081,
    routes: {
      '/items': {
        GET: async () => {
          const result = await controller.getAllItems();
          return new Response(JSON.stringify(result.data), {
            status: result.status,
            headers: { 'Content-Type': 'application/json' },
          });
        },
        POST: async (req) => {
          const body = (await req.json()) as NewInventoryItem;
          const result = await controller.createItem(body);
          return new Response(
            JSON.stringify(result.data || { error: result.error }),
            {
              status: result.status,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        },
      },
      '/items/:id': {
        GET: async (req, params) => {
          const id = parseInt(params.id);
          const result = await controller.getItem(id);
          return new Response(
            JSON.stringify(result.data || { error: result.error }),
            {
              status: result.status,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        },
        PUT: async (req, params) => {
          const id = parseInt(params.id);
          const body = (await req.json()) as NewInventoryItem;
          const result = await controller.updateItem(id, body);
          return new Response(
            JSON.stringify(result.data || { error: result.error }),
            {
              status: result.status,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        },
        DELETE: async (req, params) => {
          const id = parseInt(params.id);
          const result = await controller.deleteItem(id);
          return new Response(JSON.stringify({ error: result.error }), {
            status: result.status,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      },
      '/items/:id/quantity': {
        PUT: async (req, params) => {
          const id = parseInt(params.id);
          const body = (await req.json()) as { quantity: number };
          const result = await controller.updateQuantity(id, body.quantity);
          return new Response(
            JSON.stringify(result.data || { error: result.error }),
            {
              status: result.status,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        },
      },
      '/health': new Response('OK', { status: 200 }),
    },
  });

  console.log(`Inventory service listening on port ${server.port}`);
}

startService().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});
