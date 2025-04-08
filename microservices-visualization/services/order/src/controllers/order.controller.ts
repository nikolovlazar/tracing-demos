import { z } from 'zod';
import { createOrderSchema } from '../schemas/order.schema';
import type { IOrderRepository } from '../repositories/order.repository.interface';
import type { Order } from '../db/schema';
import { publishEvent } from '../config/rabbitmq';

export class OrderController {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async createOrder(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const validatedData = createOrderSchema.parse(body);

      // Convert price to string for database storage
      const orderData = {
        ...validatedData,
        items: validatedData.items.map((item) => ({
          ...item,
          price: item.price.toString(),
        })),
      };

      const order = await this.orderRepository.create(orderData);

      await publishEvent('order.created', {
        id: order.id,
        customerId: order.customerId,
        items: order.items,
        status: order.status,
        createdAt: order.createdAt,
      });

      return new Response(JSON.stringify(order), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error', error.errors);
        return new Response(JSON.stringify({ error: error.errors }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('Failed to create order', error);
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
