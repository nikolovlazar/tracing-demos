import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const orders = pgTable('kitchen_orders', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orderItems = pgTable('kitchen_order_items', {
  id: serial('id').primaryKey(),
  kitchenOrderId: integer('kitchen_order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.kitchenOrderId],
    references: [orders.id],
  }),
}));

export type KitchenOrder = typeof orders.$inferSelect & {
  items: KitchenOrderItem[];
};
export type NewKitchenOrder = Omit<
  typeof orders.$inferInsert,
  'id' | 'status' | 'createdAt' | 'updatedAt'
> & {
  items: NewKitchenOrderItemInput[];
};
export type KitchenOrderItem = typeof orderItems.$inferSelect;
export type NewKitchenOrderItem = typeof orderItems.$inferInsert;
export type NewKitchenOrderItemInput = Omit<
  NewKitchenOrderItem,
  'id' | 'kitchenOrderId' | 'status'
>;
