import type { KitchenOrder, NewKitchenOrder } from '../db/schema';

export interface IKitchenRepository {
  create(order: NewKitchenOrder): Promise<KitchenOrder>;
  findById(id: number): Promise<KitchenOrder | null>;
  findByOrderId(orderId: number): Promise<KitchenOrder | null>;
  findAll(): Promise<KitchenOrder[]>;
  update(
    id: number,
    order: Partial<KitchenOrder>
  ): Promise<KitchenOrder | null>;
  delete(id: number): Promise<boolean>;
  updateItemStatus(
    id: number,
    itemId: number,
    status: string
  ): Promise<boolean>;
}
