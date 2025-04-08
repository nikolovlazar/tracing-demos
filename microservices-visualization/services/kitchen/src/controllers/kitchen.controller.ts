import { PostgresKitchenRepository } from '../repositories/postgres-kitchen.repository';
import { publishEvent } from '../config/rabbitmq';
import type { KitchenOrderItem } from '../db/schema';

export class KitchenController {
  constructor(private readonly repository: PostgresKitchenRepository) {}

  async getKitchenOrders(req: Request): Promise<Response> {
    try {
      console.info('Fetching all kitchen orders');
      const orders = await this.repository.findAll();
      console.debug('Retrieved kitchen orders', { count: orders.length });
      return new Response(JSON.stringify(orders), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting kitchen orders', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return new Response(
        JSON.stringify({ error: 'Failed to get kitchen orders' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  async getKitchenOrder(req: Request, id: number): Promise<Response> {
    try {
      console.info('Fetching kitchen order', { id });
      const order = await this.repository.findById(id);

      if (!order) {
        console.warn('Kitchen order not found', { id });
        return new Response(
          JSON.stringify({ error: 'Kitchen order not found' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.debug('Retrieved kitchen order', { id });
      return new Response(JSON.stringify(order), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting kitchen order', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return new Response(
        JSON.stringify({ error: 'Failed to get kitchen order' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  async updateItemStatus(
    req: Request,
    id: number,
    itemId: number
  ): Promise<Response> {
    try {
      console.info('Updating kitchen order item status', { id, itemId });
      const body = (await req.json()) as { status: string };
      const { status } = body;

      if (!status) {
        console.warn('Missing status in request', { id, itemId });
        return new Response(JSON.stringify({ error: 'Status is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const success = await this.repository.updateItemStatus(
        id,
        itemId,
        status
      );

      if (!success) {
        console.warn('Failed to update item status', { id, itemId, status });
        return new Response(
          JSON.stringify({ error: 'Failed to update item status' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.debug('Item status updated', { id, itemId, status });
      const order = await this.repository.findById(id);

      // Check if all items are completed
      if (
        order &&
        order.items.every(
          (item: KitchenOrderItem) => item.status === 'completed'
        )
      ) {
        console.info('All items completed, updating order status', { id });
        // Update the order status to completed
        await this.repository.update(id, { status: 'completed' });

        // Publish kitchen order completed event
        await publishEvent('kitchen.order_completed', {
          kitchenOrderId: id,
          orderId: order.orderId,
        });

        console.info('Kitchen order completed event published', { id });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating item status', {
        id,
        itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return new Response(
        JSON.stringify({ error: 'Failed to update item status' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}
