import { db } from './index';
import { orders, orderItems } from './schema';

const sampleOrders = [
  {
    customerId: '1',
    deliveryAddress: '123 Main St, Anytown, Canada',
    items: [
      {
        itemId: '1',
        name: 'Margherita Pizza',
        quantity: 1,
        price: '12.99',
      },
      {
        itemId: '2',
        name: 'Caesar Salad',
        quantity: 2,
        price: '8.99',
      },
    ],
  },
  {
    customerId: '2',
    deliveryAddress: '456 Oak Ave, Somewhere, Canada',
    items: [
      {
        itemId: '3',
        name: 'Garlic Bread',
        quantity: 3,
        price: '4.99',
      },
    ],
  },
];

export async function seedDatabase() {
  console.log('Seeding order database...');

  try {
    // Clear existing data
    await db.delete(orderItems);
    await db.delete(orders);

    // Insert new orders
    for (const order of sampleOrders) {
      const [newOrder] = await db
        .insert(orders)
        .values({
          customerId: order.customerId,
          deliveryAddress: order.deliveryAddress,
        })
        .returning();

      if (!newOrder) {
        throw new Error('Failed to create order');
      }

      await db.insert(orderItems).values(
        order.items.map((item) => ({
          orderId: newOrder.id,
          ...item,
        }))
      );
    }

    console.log('Order database seeded successfully');
  } catch (error) {
    console.error('Failed to seed order database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (import.meta.main) {
  seedDatabase();
}
