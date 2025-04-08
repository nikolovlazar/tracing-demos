import { db } from '../db';
import { orders, orderItems } from '../db/schema';
import type { IOrderRepository } from './order.repository.interface';
import type {
  Order,
  NewOrder,
  NewOrderItem,
  NewOrderItemInput,
} from '../db/schema';
import { eq } from 'drizzle-orm';

export class PostgresOrderRepository implements IOrderRepository {
  async create(orderData: NewOrder): Promise<Order> {
    console.info('Creating order', { customerId: orderData.customerId });
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          customerId: orderData.customerId,
          deliveryAddress: orderData.deliveryAddress,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!order) {
        console.error('Failed to create order', {
          customerId: orderData.customerId,
        });
        throw new Error('Failed to create order');
      }

      console.debug('Created order record', {
        orderId: order.id,
        customerId: orderData.customerId,
      });

      const orderItemsData: NewOrderItem[] = orderData.items.map(
        (item: NewOrderItemInput) => ({
          orderId: order.id,
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })
      );

      await tx.insert(orderItems).values(orderItemsData);
      console.debug('Created order items', {
        orderId: order.id,
        itemCount: orderItemsData.length,
      });

      const createdOrder = await tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: {
          items: true,
        },
      });

      if (!createdOrder) {
        console.error('Failed to retrieve created order', {
          orderId: order.id,
        });
        throw new Error('Failed to retrieve created order');
      }

      console.info('Successfully created order', {
        orderId: order.id,
        customerId: orderData.customerId,
      });
      return createdOrder as Order;
    });
  }

  async findById(id: number): Promise<Order | null> {
    console.debug('Finding order by ID', { id });
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: true,
      },
    });

    if (!order) {
      console.debug('Order not found', { id });
      return null;
    }

    console.debug('Found order', { id });
    return order as Order;
  }

  async findAll(): Promise<Order[]> {
    console.debug('Finding all orders');
    const orders = await db.query.orders.findMany({
      with: {
        items: true,
      },
    });

    console.debug('Retrieved all orders', { count: orders.length });
    return orders as Order[];
  }

  async update(id: number, orderData: Partial<Order>): Promise<Order | null> {
    console.info('Updating order', { id, updates: orderData });
    const [updatedOrder] = await db
      .update(orders)
      .set({
        ...orderData,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    if (!updatedOrder) {
      console.warn('Order not found for update', { id });
      return null;
    }

    console.debug('Order updated', { id });
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    console.info('Deleting order', { id });
    const [deletedOrder] = await db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning();

    const success = !!deletedOrder;
    console.debug('Order deletion result', { id, success });
    return success;
  }
}
