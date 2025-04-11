import './instrument';

import { PostgresOrderRepository } from './repositories/postgres-order.repository';
import { registerWithConsul } from './config/consul';
import { OrderEventService } from './services/order-event.service';
import { InventoryEventService } from './services/inventory-event.service';
import { OrderController } from './controllers/order.controller';
import {
  initializeRabbitMQ,
  subscribeToKitchenEvents,
  subscribeToDeliveryEvents,
  subscribeToInventoryEvents,
} from './config/rabbitmq';
import { runMigrations } from './db/migrate';

const startService = async () => {
  try {
    await runMigrations();
    await registerWithConsul();
    await initializeRabbitMQ();

    const orderRepository = new PostgresOrderRepository();
    const orderEventService = new OrderEventService(orderRepository);
    const inventoryEventService = new InventoryEventService(orderRepository);
    const orderController = new OrderController(orderRepository);

    // Subscribe to kitchen events
    await subscribeToKitchenEvents(async (event) => {
      if (event.key === 'kitchen.order_ready') {
        await orderEventService.handleKitchenOrderReady(event);
      }
    });

    // Subscribe to delivery events
    await subscribeToDeliveryEvents(async (event) => {
      switch (event.key) {
        case 'delivery.scheduled':
          await orderEventService.handleDeliveryScheduled(event);
          break;
        case 'delivery.completed':
          await orderEventService.handleDeliveryCompleted(event);
          break;
        case 'delivery.failed':
          await orderEventService.handleDeliveryFailed(event);
          break;
      }
    });

    // Subscribe to inventory events
    await subscribeToInventoryEvents(async (event) => {
      if (event.key === 'inventory.reserved') {
        await inventoryEventService.handleInventoryReserved(event);
      }
    });

    // Start the server
    const server = Bun.serve({
      port: Number(process.env.PORT) || 8080,
      async fetch(req) {
        const url = new URL(req.url);
        console.log(`Request received: ${req.method} ${url.pathname}`);

        if (url.pathname === '/orders' && req.method === 'POST') {
          return await orderController.createOrder(req);
        }
        if (url.pathname === '/orders' && req.method === 'GET') {
          return new Response('Order service is running');
        }
        if (url.pathname === '/health') {
          return new Response('OK');
        }
        return new Response('Not found', { status: 404 });
      },
    });

    console.log(`Order service running on ${server.url}`);
  } catch (error) {
    console.error('Failed to start order service:', error);
    process.exit(1);
  }
};

startService();
