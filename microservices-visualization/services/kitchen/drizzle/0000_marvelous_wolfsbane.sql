CREATE TABLE "kitchen_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"kitchen_order_id" integer NOT NULL,
	"item_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_kitchen_order_id_kitchen_orders_id_fk" FOREIGN KEY ("kitchen_order_id") REFERENCES "public"."kitchen_orders"("id") ON DELETE cascade ON UPDATE no action;