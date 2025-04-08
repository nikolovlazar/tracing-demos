import { db } from '../db';
import { inventoryItems } from '../db/schema';
import type { IInventoryRepository } from './inventory.repository.interface';
import { eq } from 'drizzle-orm';
import type { InventoryItem, NewInventoryItem } from '../db/schema';

export class PostgresInventoryRepository implements IInventoryRepository {
  async create(item: NewInventoryItem): Promise<InventoryItem> {
    console.info('Creating inventory item', { item });
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    if (!newItem) {
      throw new Error('Failed to create inventory item');
    }
    console.debug('Created inventory item', { id: newItem.id });
    return newItem;
  }

  async findById(id: number | string): Promise<InventoryItem | null> {
    console.debug('Finding inventory item by ID', { id });
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, Number(id)));

    if (!item) {
      console.debug('Inventory item not found', { id });
      return null;
    }

    console.debug('Found inventory item', { id });
    return item;
  }

  async findAll(): Promise<InventoryItem[]> {
    console.debug('Finding all inventory items');
    const items = await db.select().from(inventoryItems);
    console.debug('Retrieved all inventory items', { count: items.length });
    return items;
  }

  async update(
    id: number | string,
    item: Partial<NewInventoryItem>
  ): Promise<InventoryItem | null> {
    console.info('Updating inventory item', { id, updates: item });
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(inventoryItems.id, Number(id)))
      .returning();

    if (!updatedItem) {
      console.warn('Inventory item not found for update', { id });
      return null;
    }

    console.debug('Inventory item updated', { id });
    return updatedItem;
  }

  async delete(id: number | string): Promise<boolean> {
    console.info('Deleting inventory item', { id });
    const [deletedItem] = await db
      .delete(inventoryItems)
      .where(eq(inventoryItems.id, Number(id)))
      .returning();

    const success = !!deletedItem;
    console.debug('Inventory item deletion result', { id, success });
    return success;
  }

  async updateQuantity(
    id: number | string,
    quantity: number
  ): Promise<InventoryItem | null> {
    console.info('Updating inventory quantity', { id, quantity });
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(inventoryItems.id, Number(id)))
      .returning();

    if (!updatedItem) {
      console.warn('Inventory item not found for quantity update', { id });
      return null;
    }

    console.debug('Inventory quantity updated', {
      id,
      oldQuantity: updatedItem.quantity - quantity,
      newQuantity: quantity,
    });
    return updatedItem;
  }
}
