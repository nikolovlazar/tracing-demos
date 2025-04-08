import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customerId: varchar('customer_id', { length: 255 }).notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'),
  deliveryId: integer('delivery_id'),
  driverId: varchar('driver_id', { length: 255 }),
  driverName: varchar('driver_name', { length: 255 }),
  estimatedDeliveryTime: timestamp('estimated_delivery_time'),
  actualDeliveryTime: timestamp('actual_delivery_time'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export type Order = typeof orders.$inferSelect & {
  items: OrderItem[];
};
export type NewOrder = Omit<
  typeof orders.$inferInsert,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'deliveryId'
  | 'driverId'
  | 'driverName'
  | 'estimatedDeliveryTime'
  | 'actualDeliveryTime'
> & {
  items: NewOrderItemInput[];
};
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type NewOrderItemInput = Omit<NewOrderItem, 'id' | 'orderId'>;
