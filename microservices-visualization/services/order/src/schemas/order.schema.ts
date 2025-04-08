import { z } from 'zod';

export const orderItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
});

export const createOrderSchema = z.object({
  customerId: z.string(),
  deliveryAddress: z.string(),
  items: z.array(orderItemSchema).min(1),
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
export type Order = CreateOrderRequest & {
  id: string;
  status: string;
  createdAt: Date;
};
