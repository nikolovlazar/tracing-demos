import { db } from './index';
import { inventoryItems } from './schema';

const products = [
  {
    id: 1,
    name: 'Margherita Pizza',
    description: 'Classic pizza with tomato sauce, mozzarella, and basil',
    quantity: 100,
    price: '12.99',
  },
  {
    id: 2,
    name: 'Caesar Salad',
    description:
      'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan',
    quantity: 50,
    price: '8.99',
  },
  {
    id: 3,
    name: 'Garlic Bread',
    description: 'Toasted bread with garlic butter and herbs',
    quantity: 75,
    price: '4.99',
  },
];

export async function seedDatabase() {
  console.log('Seeding database...');

  try {
    // Clear existing data
    await db.delete(inventoryItems);

    // Insert new products
    await db.insert(inventoryItems).values(products);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (import.meta.main) {
  seedDatabase();
}
