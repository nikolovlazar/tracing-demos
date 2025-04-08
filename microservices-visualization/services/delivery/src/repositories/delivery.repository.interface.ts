import type { Delivery, NewDelivery } from '../db/schema';

export interface IDeliveryRepository {
  create(delivery: NewDelivery): Promise<Delivery>;
  findById(id: number): Promise<Delivery | null>;
  findByOrderId(orderId: number): Promise<Delivery | null>;
  findAll(): Promise<Delivery[]>;
  update(id: number, delivery: Partial<Delivery>): Promise<Delivery | null>;
  delete(id: number): Promise<boolean>;
  updateStatus(id: number, status: string): Promise<boolean>;
  assignDriver(id: number, driverId: string): Promise<boolean>;
  updateDeliveryTime(
    id: number,
    isEstimated: boolean,
    time: Date
  ): Promise<boolean>;
}
