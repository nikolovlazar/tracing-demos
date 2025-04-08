import { serve } from 'bun';
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

  const server = serve({
    port: Number(process.env.PORT) || 8083,
    routes: {
      '/deliveries': {
        GET: async () => {
          const deliveries = await deliveryRepository.findAll();
          return Response.json(deliveries);
        },
      },
      '/deliveries/:id': {
        GET: async (req, params) => {
          const url = new URL(req.url);
          const pathParts = url.pathname.split('/');
          const id = Number(pathParts[2]);

          const delivery = await deliveryRepository.findById(id);
          if (!delivery) {
            return new Response('Delivery not found', { status: 404 });
          }
          return Response.json(delivery);
        },
      },
      '/health': new Response('OK', { status: 200 }),
    },
  });

  console.log(`Delivery service listening on port ${server.port}`);
}

startService().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});
