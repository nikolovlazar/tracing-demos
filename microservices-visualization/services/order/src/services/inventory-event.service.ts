import { PostgresOrderRepository } from '../repositories/postgres-order.repository';
import { publishEvent } from '../config/rabbitmq';

export class InventoryEventService {
  constructor(private readonly repository: PostgresOrderRepository) {}

  async handleInventoryReserved(event: any): Promise<void> {
    console.log('Processing inventory reserved event:', event);

    const orderId = event.data.orderId;

    // Find the order
    const order = await this.repository.findById(orderId);

    if (!order) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    // Update the order status to "awaiting kitchen"
    const updatedOrder = await this.repository.update(orderId, {
      status: 'awaiting_kitchen',
    });

    if (!updatedOrder) {
      console.error(`Failed to update order ${orderId}`);
      return;
    }

    console.log(`Order ${orderId} status updated to awaiting_kitchen`);

    // Publish order ready for kitchen event
    await publishEvent('order.ready_for_kitchen', {
      orderId,
      items: order.items,
    });

    console.log(`Published order.ready_for_kitchen event for order ${orderId}`);
  }
}
