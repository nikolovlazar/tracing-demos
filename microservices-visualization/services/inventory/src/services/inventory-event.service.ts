import { PostgresInventoryRepository } from '../repositories/postgres-inventory.repository';
import { publishEvent } from '../config/rabbitmq';

export class InventoryEventService {
  constructor(private readonly repository: PostgresInventoryRepository) {}

  async handleOrderCreated(event: any): Promise<void> {
    console.info('Processing order created event:', { event });

    const orderId = event.data.id;
    const orderItems = event.data.items;

    // Check if we have enough inventory for all items
    const inventoryChecks = await Promise.all(
      orderItems.map(async (item: any) => {
        const inventoryItem = await this.repository.findById(item.itemId);

        if (!inventoryItem) {
          console.warn('Inventory item not found', { itemId: item.itemId });
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
      console.info('All items available, reserving inventory', { orderId });

      // Reserve the inventory for each item
      await Promise.all(
        orderItems.map(async (item: any) => {
          const inventoryItem = await this.repository.findById(item.itemId);
          if (inventoryItem) {
            await this.repository.updateQuantity(
              item.itemId,
              inventoryItem.quantity - item.quantity
            );
            console.debug('Inventory quantity updated', {
              itemId: item.itemId,
              oldQuantity: inventoryItem.quantity,
              newQuantity: inventoryItem.quantity - item.quantity,
            });
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

      console.info('Inventory reserved event published', { orderId });
    } else {
      console.warn('Inventory unavailable for order', {
        orderId,
        unavailableItems: inventoryChecks.filter((check) => !check.available),
      });

      // Publish inventory unavailable event
      await publishEvent('inventory.unavailable', {
        orderId,
        items: inventoryChecks,
      });

      console.info('Inventory unavailable event published', { orderId });
    }
  }
}
