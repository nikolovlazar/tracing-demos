import { db } from './index';
import { orders, orderItems } from './schema';

const sampleKitchenOrders = [
  {
    orderId: 1,
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
  console.log('Seeding kitchen database...');

  try {
    // Clear existing data
    await db.delete(orderItems);
    await db.delete(orders);

    // Insert new kitchen orders
    for (const order of sampleKitchenOrders) {
      const [newOrder] = await db
        .insert(orders)
        .values({
          orderId: order.orderId,
        })
        .returning();

      if (!newOrder) {
        throw new Error('Failed to create kitchen order');
      }

      await db.insert(orderItems).values(
        order.items.map((item) => ({
          kitchenOrderId: newOrder.id,
          ...item,
        }))
      );
    }

    console.log('Kitchen database seeded successfully');
  } catch (error) {
    console.error('Failed to seed kitchen database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (import.meta.main) {
  seedDatabase();
}
