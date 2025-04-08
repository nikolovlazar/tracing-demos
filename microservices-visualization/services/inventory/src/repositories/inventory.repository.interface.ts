import { InventoryItem, NewInventoryItem } from '../db/schema';

export interface IInventoryRepository {
  create(item: NewInventoryItem): Promise<InventoryItem>;
  findById(id: number): Promise<InventoryItem | null>;
  findAll(): Promise<InventoryItem[]>;
  update(
    id: number,
    item: Partial<NewInventoryItem>
  ): Promise<InventoryItem | null>;
  delete(id: number): Promise<boolean>;
  updateQuantity(id: number, quantity: number): Promise<InventoryItem | null>;
}
