import { PostgresInventoryRepository } from '../repositories/postgres-inventory.repository';
import { publishEvent } from '../config/rabbitmq';

export class OrderEventService {
  constructor(private readonly repository: PostgresInventoryRepository) {}

  async handleOrderCreated(event: any): Promise<void> {
    console.log('Processing order created event:', event);

    const orderId = event.data.id;
    const orderItems = event.data.items;

    // Check if we have enough inventory for all items
    const inventoryChecks = await Promise.all(
      orderItems.map(async (item: any) => {
        const inventoryItem = await this.repository.findById(item.itemId);

        if (!inventoryItem) {
          return {
            itemId: item.itemId,
            available: false,
            reason: 'Item not found in inventory',
          };
        }

        const hasEnoughStock = inventoryItem.quantity >= item.quantity;

        return {
          itemId: item.itemId,
          available: hasEnoughStock,
          currentStock: inventoryItem.quantity,
          requestedQuantity: item.quantity,
          reason: hasEnoughStock ? null : 'Insufficient stock',
        };
      })
    );

    // Check if all items have sufficient stock
    const allItemsAvailable = inventoryChecks.every((check) => check.available);

    if (allItemsAvailable) {
      // Reserve the inventory for each item
      await Promise.all(
        orderItems.map(async (item: any) => {
          const inventoryItem = await this.repository.findById(item.itemId);
          if (inventoryItem) {
            await this.repository.updateQuantity(
              item.itemId,
              inventoryItem.quantity - item.quantity
            );
          }
        })
      );

      // Publish inventory reserved event
      await publishEvent('inventory.reserved', {
        orderId,
        items: orderItems.map((item: any) => ({
          itemId: item.itemId,
          quantity: item.quantity,
        })),
      });

      console.log(`Inventory reserved for order ${orderId}`);
    } else {
      // Publish inventory unavailable event
      await publishEvent('inventory.unavailable', {
        orderId,
        items: inventoryChecks,
      });

      console.log(`Inventory unavailable for order ${orderId}`);
    }
  }
}
