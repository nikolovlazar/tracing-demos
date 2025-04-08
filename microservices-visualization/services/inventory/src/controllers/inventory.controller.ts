import type { IInventoryRepository } from '../repositories/inventory.repository.interface';
import type { NewInventoryItem } from '../db/schema';

export class InventoryController {
  constructor(private readonly repository: IInventoryRepository) {}

  async createItem(item: NewInventoryItem) {
    try {
      console.info('Creating inventory item', { item });
      const newItem = await this.repository.create(item);
      console.debug('Inventory item created', { id: newItem.id });
      return { status: 201, data: newItem };
    } catch (error) {
      console.error('Error creating inventory item', {
        error: error instanceof Error ? error.message : 'Unknown error',
        item,
      });
      return { status: 500, error: 'Failed to create inventory item' };
    }
  }

  async getItem(id: number) {
    try {
      console.info('Fetching inventory item', { id });
      const item = await this.repository.findById(id);
      if (!item) {
        console.warn('Inventory item not found', { id });
        return { status: 404, error: 'Inventory item not found' };
      }
      console.debug('Retrieved inventory item', { id });
      return { status: 200, data: item };
    } catch (error) {
      console.error('Error fetching inventory item', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { status: 500, error: 'Failed to fetch inventory item' };
    }
  }

  async getAllItems() {
    try {
      console.info('Fetching all inventory items');
      const items = await this.repository.findAll();
      console.debug('Retrieved inventory items', { count: items.length });
      return { status: 200, data: items };
    } catch (error) {
      console.error('Error fetching inventory items', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { status: 500, error: 'Failed to fetch inventory items' };
    }
  }

  async updateItem(id: number, item: Partial<NewInventoryItem>) {
    try {
      console.info('Updating inventory item', { id, item });
      const updatedItem = await this.repository.update(id, item);
      if (!updatedItem) {
        console.warn('Inventory item not found for update', { id });
        return { status: 404, error: 'Inventory item not found' };
      }
      console.debug('Inventory item updated', { id });
      return { status: 200, data: updatedItem };
    } catch (error) {
      console.error('Error updating inventory item', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { status: 500, error: 'Failed to update inventory item' };
    }
  }

  async deleteItem(id: number) {
    try {
      console.info('Deleting inventory item', { id });
      const success = await this.repository.delete(id);
      if (!success) {
        console.warn('Inventory item not found for deletion', { id });
        return { status: 404, error: 'Inventory item not found' };
      }
      console.debug('Inventory item deleted', { id });
      return { status: 204 };
    } catch (error) {
      console.error('Error deleting inventory item', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { status: 500, error: 'Failed to delete inventory item' };
    }
  }

  async updateQuantity(id: number, quantity: number) {
    try {
      console.info('Updating inventory quantity', { id, quantity });
      const updatedItem = await this.repository.updateQuantity(id, quantity);
      if (!updatedItem) {
        console.warn('Inventory item not found for quantity update', { id });
        return { status: 404, error: 'Inventory item not found' };
      }
      console.debug('Inventory quantity updated', {
        id,
        oldQuantity: updatedItem.quantity - quantity,
        newQuantity: quantity,
      });
      return { status: 200, data: updatedItem };
    } catch (error) {
      console.error('Error updating inventory quantity', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { status: 500, error: 'Failed to update inventory quantity' };
    }
  }
}
