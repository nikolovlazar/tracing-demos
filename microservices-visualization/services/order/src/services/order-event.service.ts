import { PostgresOrderRepository } from '../repositories/postgres-order.repository';
import { publishEvent } from '../config/rabbitmq';

export class OrderEventService {
  constructor(private readonly repository: PostgresOrderRepository) {}

  async handleDeliveryScheduled(event: any): Promise<void> {
    console.info('Processing delivery scheduled event:', { event });

    const orderId = event.data.orderId;
    const deliveryId = event.data.deliveryId;
    const driverId = event.data.driverId;
    const driverName = event.data.driverName;
    const estimatedDeliveryTime = event.data.estimatedDeliveryTime;

    try {
      // Update order status to shipped
      const order = await this.repository.findById(orderId);
      if (!order) {
        console.error('Order not found', { orderId });
        return;
      }

      await this.repository.update(orderId, {
        ...order,
        status: 'shipped',
        deliveryId,
        driverId,
        driverName,
        estimatedDeliveryTime,
      });

      console.info('Order status updated to shipped', {
        orderId,
        deliveryId,
        driverId,
        estimatedDeliveryTime,
      });

      // Publish order shipped event
      await publishEvent('order.shipped', {
        orderId,
        customerId: order.customerId,
        deliveryId,
        driverId,
        driverName,
        estimatedDeliveryTime,
      });

      console.info('Order shipped event published', { orderId });
    } catch (error) {
      console.error('Error updating order', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async handleDeliveryCompleted(event: any): Promise<void> {
    console.info('Processing delivery completed event:', { event });

    const orderId = event.data.orderId;
    const deliveryId = event.data.deliveryId;
    const actualDeliveryTime = event.data.actualDeliveryTime;

    try {
      // Update order status to delivered
      const order = await this.repository.findById(orderId);
      if (!order) {
        console.error('Order not found', { orderId });
        return;
      }

      await this.repository.update(orderId, {
        ...order,
        status: 'delivered',
        actualDeliveryTime,
      });

      console.info('Order status updated to delivered', {
        orderId,
        deliveryId,
        actualDeliveryTime,
      });

      // Publish order delivered event
      await publishEvent('order.delivered', {
        orderId,
        customerId: order.customerId,
        deliveryId,
        actualDeliveryTime,
      });

      console.info('Order delivered event published', { orderId });
    } catch (error) {
      console.error('Error updating order', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async handleDeliveryFailed(event: any): Promise<void> {
    console.info('Processing delivery failed event:', { event });

    const orderId = event.data.orderId;
    const reason = event.data.reason;

    try {
      // Update order status to delivery_failed
      const order = await this.repository.findById(orderId);
      if (!order) {
        console.error('Order not found', { orderId });
        return;
      }

      await this.repository.update(orderId, {
        ...order,
        status: 'delivery_failed',
      });

      console.warn('Order status updated to delivery_failed', {
        orderId,
        reason,
      });

      // Publish order delivery failed event
      await publishEvent('order.delivery_failed', {
        orderId,
        customerId: order.customerId,
        reason,
      });

      console.info('Order delivery failed event published', { orderId });
    } catch (error) {
      console.error('Error updating order', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async handleKitchenOrderReady(event: any): Promise<void> {
    console.info('Processing kitchen order ready event:', event);

    const orderId = event.data.orderId;

    try {
      // Get the order to check its type/details
      const order = await this.repository.findById(orderId);
      if (!order) {
        console.error('Order not found', { orderId });
        return;
      }

      // Update order status to ready
      await this.repository.update(orderId, {
        ...order,
        status: 'ready',
      });

      console.info('Order status updated to ready', { orderId });

      // If this is a delivery order, initiate delivery
      if (order.deliveryAddress) {
        // Publish event to start delivery
        await publishEvent('order.ready_for_delivery', {
          orderId,
          customerId: order.customerId,
          deliveryAddress: order.deliveryAddress,
          items: order.items,
        });
        console.info('Order ready for delivery event published', { orderId });
      } else {
        // For non-delivery orders (pickup/dine-in), just publish ready event
        await publishEvent('order.ready', {
          orderId,
          customerId: order.customerId,
          items: order.items,
        });
        console.info('Order ready event published', { orderId });
      }
    } catch (error) {
      console.error('Error handling kitchen order ready', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
