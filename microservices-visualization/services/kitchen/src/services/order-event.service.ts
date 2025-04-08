import { PostgresKitchenRepository } from '../repositories/postgres-kitchen.repository';
import { publishEvent } from '../config/rabbitmq';
import { KitchenOrderProcessorService } from './kitchen-order-processor.service';

export class OrderEventService {
  private kitchenOrderProcessor: KitchenOrderProcessorService;

  constructor(private readonly repository: PostgresKitchenRepository) {
    this.kitchenOrderProcessor = new KitchenOrderProcessorService(repository);
  }

  async handleOrderReadyForKitchen(event: any): Promise<void> {
    console.log('Processing order ready for kitchen event:', event);

    const orderId = event.data.orderId;
    const items = event.data.items;

    // Check if the order already exists in the kitchen system
    const existingOrder = await this.repository.findByOrderId(orderId);

    if (existingOrder) {
      console.log(`Order ${orderId} already exists in kitchen system`);
      return;
    }

    // Create a new kitchen order
    const kitchenOrder = await this.repository.create({
      orderId,
      items: items.map((item: any) => ({
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
      })),
    });

    console.log(`Created kitchen order for order ${orderId}`);

    // Publish kitchen order received event
    await publishEvent('kitchen.order_received', {
      kitchenOrderId: kitchenOrder.id,
      orderId,
      items: kitchenOrder.items,
    });

    console.log(`Published kitchen.order_received event for order ${orderId}`);

    // Start processing the kitchen order automatically
    // This will run in the background and not block the event handling
    this.kitchenOrderProcessor.processOrder(kitchenOrder).catch((error) => {
      console.error(
        `Error processing kitchen order ${kitchenOrder.id}:`,
        error
      );
    });
  }
}
