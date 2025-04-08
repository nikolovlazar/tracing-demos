import { db } from '../db';
import { orders, orderItems } from '../db/schema';
import type { IKitchenRepository } from './kitchen.repository.interface';
import type {
  KitchenOrder,
  NewKitchenOrder,
  NewKitchenOrderItem,
  NewKitchenOrderItemInput,
} from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export class PostgresKitchenRepository implements IKitchenRepository {
  async create(orderData: NewKitchenOrder): Promise<KitchenOrder> {
    console.info('Creating kitchen order', { orderId: orderData.orderId });
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          orderId: orderData.orderId,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!order) {
        console.error('Failed to create kitchen order', {
          orderId: orderData.orderId,
        });
        throw new Error('Failed to create kitchen order');
      }

      console.debug('Created kitchen order record', {
        kitchenOrderId: order.id,
        orderId: orderData.orderId,
      });

      const orderItemsData: NewKitchenOrderItem[] = orderData.items.map(
        (item: NewKitchenOrderItemInput) => ({
          kitchenOrderId: order.id,
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          status: 'pending',
        })
      );

      await tx.insert(orderItems).values(orderItemsData);
      console.debug('Created kitchen order items', {
        kitchenOrderId: order.id,
        itemCount: orderItemsData.length,
      });

      const createdOrder = await tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: {
          items: true,
        },
      });

      if (!createdOrder) {
        console.error('Failed to retrieve created kitchen order', {
          kitchenOrderId: order.id,
        });
        throw new Error('Failed to retrieve created kitchen order');
      }

      console.info('Successfully created kitchen order', {
        kitchenOrderId: order.id,
        orderId: orderData.orderId,
      });
      return createdOrder as KitchenOrder;
    });
  }

  async findById(id: number): Promise<KitchenOrder | null> {
    console.debug('Finding kitchen order by ID', { id });
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: true,
      },
    });

    if (!order) {
      console.debug('Kitchen order not found', { id });
      return null;
    }

    console.debug('Found kitchen order', { id });
    return order as KitchenOrder;
  }

  async findByOrderId(orderId: number): Promise<KitchenOrder | null> {
    console.debug('Finding kitchen order by order ID', { orderId });
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
      with: {
        items: true,
      },
    });

    if (!order) {
      console.debug('Kitchen order not found for order', { orderId });
      return null;
    }

    console.debug('Found kitchen order for order', {
      orderId,
      kitchenOrderId: order.id,
    });
    return order as KitchenOrder;
  }

  async findAll(): Promise<KitchenOrder[]> {
    console.debug('Finding all kitchen orders');
    const orders = await db.query.orders.findMany({
      with: {
        items: true,
      },
    });

    console.debug('Retrieved all kitchen orders', { count: orders.length });
    return orders as KitchenOrder[];
  }

  async update(
    id: number,
    orderData: Partial<KitchenOrder>
  ): Promise<KitchenOrder | null> {
    console.info('Updating kitchen order', { id, updates: orderData });
    const [updatedOrder] = await db
      .update(orders)
      .set({
        ...orderData,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    if (!updatedOrder) {
      console.warn('Kitchen order not found for update', { id });
      return null;
    }

    console.debug('Kitchen order updated', { id });
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    console.info('Deleting kitchen order', { id });
    const [deletedOrder] = await db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning();

    const success = !!deletedOrder;
    console.debug('Kitchen order deletion result', { id, success });
    return success;
  }

  async updateItemStatus(
    orderId: number,
    itemId: number,
    status: string
  ): Promise<boolean> {
    const [updatedItem] = await db
      .update(orderItems)
      .set({ status })
      .where(
        sql`${orderItems.kitchenOrderId} = ${orderId} and ${orderItems.id} = ${itemId}`
      )
      .returning();

    return !!updatedItem;
  }

  async updateStatus(orderId: number, status: string): Promise<void> {
    await db
      .update(orders)
      .set({ status })
      .where(sql`${orders.id} = ${orderId}`);
  }
}
