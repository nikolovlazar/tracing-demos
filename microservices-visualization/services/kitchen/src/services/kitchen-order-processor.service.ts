import { PostgresKitchenRepository } from '../repositories/postgres-kitchen.repository';
import { publishEvent } from '../config/rabbitmq';
import type { KitchenOrder } from '../db/schema';

export class KitchenOrderProcessorService {
  constructor(private readonly repository: PostgresKitchenRepository) {}

  /**
   * Process a kitchen order by simulating preparation time and marking it as ready
   * @param kitchenOrder The kitchen order to process
   */
  async processOrder(kitchenOrder: KitchenOrder): Promise<void> {
    console.info('Starting to process kitchen order', {
      kitchenOrderId: kitchenOrder.id,
      orderId: kitchenOrder.orderId,
    });

    // Simulate kitchen preparation time
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Update order status to ready
    await this.repository.updateStatus(kitchenOrder.id, 'ready');

    console.info('Kitchen order is ready', {
      kitchenOrderId: kitchenOrder.id,
      orderId: kitchenOrder.orderId,
    });

    // Publish order ready event
    await publishEvent('kitchen.order_ready', {
      kitchenOrderId: kitchenOrder.id,
      orderId: kitchenOrder.orderId,
      items: kitchenOrder.items,
    });

    console.info('Kitchen order ready event published', {
      kitchenOrderId: kitchenOrder.id,
      orderId: kitchenOrder.orderId,
    });
  }
}
