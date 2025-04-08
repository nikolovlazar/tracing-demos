import { db } from './index';
import { deliveries, deliveryItems } from './schema';

const sampleDeliveries = [
  {
    orderId: 1,
    customerId: '1',
    items: [
      {
        itemId: '1',
        name: 'Margherita Pizza',
        quantity: 1,
      },
      {
        itemId: '2',
        name: 'Caesar Salad',
        quantity: 2,
      },
    ],
  },
  {
    orderId: 2,
    customerId: '2',
    items: [
      {
        itemId: '3',
        name: 'Garlic Bread',
        quantity: 3,
      },
    ],
  },
];

export async function seedDatabase() {
  console.log('Seeding delivery database...');

  try {
    // Clear existing data
    await db.delete(deliveryItems);
    await db.delete(deliveries);

    // Insert new deliveries
    for (const delivery of sampleDeliveries) {
      const [newDelivery] = await db
        .insert(deliveries)
        .values({
          orderId: delivery.orderId,
          customerId: delivery.customerId,
        })
        .returning();

      if (!newDelivery) {
        throw new Error('Failed to create delivery');
      }

      await db.insert(deliveryItems).values(
        delivery.items.map((item) => ({
          deliveryId: newDelivery.id,
          ...item,
        }))
      );
    }

    console.log('Delivery database seeded successfully');
  } catch (error) {
    console.error('Failed to seed delivery database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (import.meta.main) {
  seedDatabase();
}
