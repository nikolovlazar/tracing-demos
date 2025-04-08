import { PostgresDeliveryRepository } from '../repositories/postgres-delivery.repository';
import { publishEvent } from '../config/rabbitmq';

// Simulated list of available drivers (in a real system, this would be in a database)
const AVAILABLE_DRIVERS = [
  { id: 'DRIVER-1', name: 'John Doe', available: true },
  { id: 'DRIVER-2', name: 'Jane Smith', available: true },
  { id: 'DRIVER-3', name: 'Bob Johnson', available: false },
];

export class DeliveryEventService {
  constructor(private readonly repository: PostgresDeliveryRepository) {}

  private findAvailableDriver(): { id: string; name: string } | null {
    // In a real system, this would query a driver management service
    const availableDriver = AVAILABLE_DRIVERS.find(
      (driver) => driver.available
    );
    if (!availableDriver) {
      console.warn('No available drivers found');
      return null;
    }
    console.debug('Found available driver', {
      driverId: availableDriver.id,
      driverName: availableDriver.name,
    });
    return {
      id: availableDriver.id,
      name: availableDriver.name,
    };
  }

  async handleOrderReadyForDelivery(event: any): Promise<void> {
    console.info('Processing order ready for delivery event', { event });

    const orderId = event.data.orderId;
    const customerId = event.data.customerId;
    const items = event.data.items;
    const address = event.data.deliveryAddress;

    // Validate delivery address
    if (!address) {
      console.error('Invalid delivery address', {
        orderId,
        address,
      });
      await publishEvent('delivery.failed', {
        orderId,
        customerId,
        reason: 'Invalid delivery address',
      });
      return;
    }

    // Check if the delivery already exists
    const existingDelivery = await this.repository.findByOrderId(orderId);
    if (existingDelivery) {
      console.warn('Delivery already exists', {
        orderId,
        deliveryId: existingDelivery.id,
      });
      return;
    }

    // Find an available driver
    const driver = this.findAvailableDriver();
    if (!driver) {
      console.error('No available drivers', { orderId });
      await publishEvent('delivery.failed', {
        orderId,
        customerId,
        reason: 'No available drivers',
      });
      return;
    }

    // Create a new delivery
    const delivery = await this.repository.create({
      orderId,
      customerId,
      items: items.map((item: any) => ({
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
      })),
    });

    console.info('Created new delivery', {
      orderId,
      deliveryId: delivery.id,
    });

    // Assign the driver
    await this.repository.assignDriver(delivery.id, driver.id);
    console.debug('Driver assigned to delivery', {
      deliveryId: delivery.id,
      driverId: driver.id,
    });

    // Set estimated delivery time (random time between 15-30 minutes from now)
    const estimatedDeliveryTime = new Date();
    estimatedDeliveryTime.setMinutes(
      estimatedDeliveryTime.getMinutes() + Math.floor(Math.random() * 15) + 15
    );
    await this.repository.updateDeliveryTime(
      delivery.id,
      true,
      estimatedDeliveryTime
    );
    console.debug('Estimated delivery time set', {
      deliveryId: delivery.id,
      estimatedDeliveryTime,
    });

    // Publish delivery scheduled event
    await publishEvent('delivery.scheduled', {
      deliveryId: delivery.id,
      orderId,
      customerId,
      driverId: driver.id,
      driverName: driver.name,
      estimatedDeliveryTime,
      address,
      items: delivery.items,
    });

    console.info('Delivery scheduled event published', {
      orderId,
      deliveryId: delivery.id,
    });

    // Simulate delivery completion after a random delay (5-10 seconds for demo purposes)
    // In a real system, this would be triggered by the driver's app
    const delayMs = Math.floor(Math.random() * 5000) + 5000;
    console.debug('Scheduling delivery completion', {
      deliveryId: delivery.id,
      delayMs,
    });

    setTimeout(async () => {
      try {
        await this.repository.updateStatus(delivery.id, 'completed');
        const actualDeliveryTime = new Date();
        await this.repository.updateDeliveryTime(
          delivery.id,
          false,
          actualDeliveryTime
        );

        console.info('Delivery completed', {
          deliveryId: delivery.id,
          actualDeliveryTime,
        });

        await publishEvent('delivery.completed', {
          deliveryId: delivery.id,
          orderId,
          customerId,
          driverId: driver.id,
          driverName: driver.name,
          actualDeliveryTime,
        });

        console.info('Delivery completed event published', {
          orderId,
          deliveryId: delivery.id,
        });
      } catch (error) {
        console.error('Error completing delivery', {
          deliveryId: delivery.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, delayMs);
  }
}
