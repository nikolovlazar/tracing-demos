import type { Order, NewOrder } from '../db/schema';

export interface IOrderRepository {
  create(order: NewOrder): Promise<Order>;
  findById(id: number): Promise<Order | null>;
  findAll(): Promise<Order[]>;
  update(id: number, order: Partial<Order>): Promise<Order | null>;
  delete(id: number): Promise<boolean>;
}
