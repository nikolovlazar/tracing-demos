import './instrument';

import { PostgresDeliveryRepository } from './repositories/postgres-delivery.repository';
import { registerWithConsul } from './config/consul';
import { initializeRabbitMQ, subscribeToOrderEvents } from './config/rabbitmq';
import { DeliveryEventService } from './services/delivery-event.service';
import { runMigrations } from './db/migrate';

async function startService() {
  // Run migrations first
  await runMigrations();

  const deliveryRepository = new PostgresDeliveryRepository();
  const deliveryEventService = new DeliveryEventService(deliveryRepository);

  // Register with Consul and initialize RabbitMQ
  await registerWithConsul();
  await initializeRabbitMQ();

  // Subscribe to order events
  await subscribeToOrderEvents(async (event) => {
    if (event.key === 'order.ready_for_delivery') {
      await deliveryEventService.handleOrderReadyForDelivery(event);
    }
  });

  const server = Bun.serve({
    port: Number(process.env.PORT) || 8083,
    async fetch(req) {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');

      if (url.pathname === '/deliveries' && req.method === 'GET') {
        const deliveries = await deliveryRepository.findAll();
        return Response.json(deliveries);
      }

      if (url.pathname === '/health') {
        return new Response('OK', { status: 200 });
      }

      return new Response('Not found', { status: 404 });
    },
  });

  console.log(`Delivery service listening on port ${server.port}`);
}

startService().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});
