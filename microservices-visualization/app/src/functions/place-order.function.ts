import type { OrderItem } from "@/routes";
import { createServerFn } from "@tanstack/react-start";
import { getHeaders } from "@tanstack/start-server-core";

interface OrderData {
  customerId: string;
  deliveryAddress: string;
  items: OrderItem[];
}

export const placeOrderFn = createServerFn({
  method: "POST",
})
  .validator((data: OrderData): OrderData => {
    if (!data.customerId || !data.deliveryAddress || !data.items?.length) {
      throw new Error("Missing required fields");
    }

    return {
      customerId: data.customerId,
      deliveryAddress: data.deliveryAddress,
      items: data.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  })
  .handler(async ({ data }) => {
    const headers = getHeaders();
    const sentryTrace = headers["sentry-trace"] ?? "";
    const baggage = headers.baggage ?? "";

    console.log("sentryTrace: ", sentryTrace);
    console.log("baggage: ", baggage);

    const response = await fetch(`${process.env.API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "sentry-trace": sentryTrace,
        baggage: baggage,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to place order: ${errorData.message}`);
    }

    return await response.json();
  });
