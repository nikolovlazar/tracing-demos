import { db } from '../db';
import { deliveries, deliveryItems } from '../db/schema';
import type { IDeliveryRepository } from './delivery.repository.interface';
import type {
  Delivery,
  NewDelivery,
  NewDeliveryItem,
  NewDeliveryItemInput,
} from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class PostgresDeliveryRepository implements IDeliveryRepository {
  async create(deliveryData: NewDelivery): Promise<Delivery> {
    console.info('Creating new delivery', { orderId: deliveryData.orderId });
    return await db.transaction(async (tx) => {
      const [delivery] = await tx
        .insert(deliveries)
        .values({
          orderId: deliveryData.orderId,
          customerId: deliveryData.customerId,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!delivery) {
        console.error('Failed to create delivery', {
          orderId: deliveryData.orderId,
        });
        throw new Error('Failed to create delivery');
      }

      console.debug('Created delivery record', {
        deliveryId: delivery.id,
        orderId: deliveryData.orderId,
      });

      const deliveryItemsData: NewDeliveryItem[] = deliveryData.items.map(
        (item: NewDeliveryItemInput) => ({
          deliveryId: delivery.id,
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
        })
      );

      await tx.insert(deliveryItems).values(deliveryItemsData);
      console.debug('Created delivery items', {
        deliveryId: delivery.id,
        itemCount: deliveryItemsData.length,
      });

      const createdDelivery = await tx.query.deliveries.findFirst({
        where: eq(deliveries.id, delivery.id),
        with: {
          items: true,
        },
      });

      if (!createdDelivery) {
        console.error('Failed to retrieve created delivery', {
          deliveryId: delivery.id,
        });
        throw new Error('Failed to retrieve created delivery');
      }

      console.info('Successfully created delivery', {
        deliveryId: delivery.id,
        orderId: deliveryData.orderId,
      });
      return createdDelivery as Delivery;
    });
  }

  async findById(id: number): Promise<Delivery | null> {
    console.debug('Finding delivery by ID', { id });
    const delivery = await db.query.deliveries.findFirst({
      where: eq(deliveries.id, id),
      with: {
        items: true,
      },
    });

    if (!delivery) {
      console.debug('Delivery not found', { id });
      return null;
    }

    console.debug('Found delivery', { id });
    return delivery as Delivery;
  }

  async findByOrderId(orderId: number): Promise<Delivery | null> {
    console.debug('Finding delivery by order ID', { orderId });
    const delivery = await db.query.deliveries.findFirst({
      where: eq(deliveries.orderId, orderId),
      with: {
        items: true,
      },
    });

    if (!delivery) {
      console.debug('Delivery not found for order', { orderId });
      return null;
    }

    console.debug('Found delivery for order', {
      orderId,
      deliveryId: delivery.id,
    });
    return delivery as Delivery;
  }

  async findAll(): Promise<Delivery[]> {
    console.debug('Finding all deliveries');
    const deliveries = await db.query.deliveries.findMany({
      with: {
        items: true,
      },
    });

    console.debug('Retrieved all deliveries', { count: deliveries.length });
    return deliveries as Delivery[];
  }

  async update(
    id: number,
    deliveryData: Partial<Delivery>
  ): Promise<Delivery | null> {
    console.info('Updating delivery', { id, updates: deliveryData });
    const [updatedDelivery] = await db
      .update(deliveries)
      .set({
        ...deliveryData,
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, id))
      .returning();

    if (!updatedDelivery) {
      console.warn('Delivery not found for update', { id });
      return null;
    }

    console.debug('Delivery updated', { id });
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    console.info('Deleting delivery', { id });
    const [deletedDelivery] = await db
      .delete(deliveries)
      .where(eq(deliveries.id, id))
      .returning();

    const success = !!deletedDelivery;
    console.debug('Delivery deletion result', { id, success });
    return success;
  }

  async updateStatus(id: number, status: string): Promise<boolean> {
    console.info('Updating delivery status', { id, status });
    const [updatedDelivery] = await db
      .update(deliveries)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, id))
      .returning();

    const success = !!updatedDelivery;
    console.debug('Delivery status update result', { id, status, success });
    return success;
  }

  async assignDriver(id: number, driverId: string): Promise<boolean> {
    console.info('Assigning driver to delivery', { id, driverId });
    const [updatedDelivery] = await db
      .update(deliveries)
      .set({
        driverId,
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, id))
      .returning();

    const success = !!updatedDelivery;
    console.debug('Driver assignment result', { id, driverId, success });
    return success;
  }

  async updateDeliveryTime(
    id: number,
    isEstimated: boolean,
    time: Date
  ): Promise<boolean> {
    console.info('Updating delivery time', {
      id,
      isEstimated,
      time,
    });
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (isEstimated) {
      updateData.estimatedDeliveryTime = time;
    } else {
      updateData.actualDeliveryTime = time;
    }

    const [updatedDelivery] = await db
      .update(deliveries)
      .set(updateData)
      .where(eq(deliveries.id, id))
      .returning();

    const success = !!updatedDelivery;
    console.debug('Delivery time update result', {
      id,
      isEstimated,
      time,
      success,
    });
    return success;
  }
}
