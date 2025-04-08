import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const deliveries = pgTable('deliveries', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  customerId: varchar('customer_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  driverId: varchar('driver_id', { length: 255 }),
  estimatedDeliveryTime: timestamp('estimated_delivery_time'),
  actualDeliveryTime: timestamp('actual_delivery_time'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const deliveryItems = pgTable('delivery_items', {
  id: serial('id').primaryKey(),
  deliveryId: integer('delivery_id')
    .notNull()
    .references(() => deliveries.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
});

export const deliveriesRelations = relations(deliveries, ({ many }) => ({
  items: many(deliveryItems),
}));

export const deliveryItemsRelations = relations(deliveryItems, ({ one }) => ({
  delivery: one(deliveries, {
    fields: [deliveryItems.deliveryId],
    references: [deliveries.id],
  }),
}));

export type Delivery = typeof deliveries.$inferSelect & {
  items: DeliveryItem[];
};
export type NewDelivery = Omit<
  typeof deliveries.$inferInsert,
  'id' | 'status' | 'createdAt' | 'updatedAt'
> & {
  items: NewDeliveryItemInput[];
};
export type DeliveryItem = typeof deliveryItems.$inferSelect;
export type NewDeliveryItem = typeof deliveryItems.$inferInsert;
export type NewDeliveryItemInput = Omit<NewDeliveryItem, 'id' | 'deliveryId'>;
