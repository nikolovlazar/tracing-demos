import { connect } from 'amqplib';
import type { Channel, Connection, ConsumeMessage } from 'amqplib';

// Use any for now to avoid type issues with amqplib
let channel: any = null;
let connection: any = null;

export const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://app_user:app_password@rabbitmq:5672';
export const ORDER_EXCHANGE = 'order_exchange';
export const ORDER_QUEUE = 'order_queue';
export const KITCHEN_EXCHANGE = 'kitchen_exchange';
export const DELIVERY_EXCHANGE = 'delivery_exchange';
export const INVENTORY_EXCHANGE = 'inventory_exchange';

export const initializeRabbitMQ = async () => {
  try {
    const url = RABBITMQ_URL;
    const orderExchange = ORDER_EXCHANGE;
    const kitchenExchange = KITCHEN_EXCHANGE;
    const deliveryExchange = DELIVERY_EXCHANGE;
    const inventoryExchange = INVENTORY_EXCHANGE;
    const orderQueue = ORDER_QUEUE;
    const kitchenQueue = 'order_kitchen_events';
    const deliveryQueue = 'order_delivery_events';
    const inventoryQueue = 'order_inventory_events';

    connection = await connect(url);
    if (!connection) {
      throw new Error('Failed to connect to RabbitMQ');
    }

    channel = await connection.createChannel();
    if (!channel) {
      throw new Error('Failed to create RabbitMQ channel');
    }

    // Set up order events exchange and queue
    await channel.assertExchange(orderExchange, 'topic', { durable: true });
    await channel.assertQueue(orderQueue, { durable: true });
    await channel.bindQueue(orderQueue, orderExchange, 'order.#');

    // Set up kitchen events exchange and queue
    await channel.assertExchange(kitchenExchange, 'topic', { durable: true });
    await channel.assertQueue(kitchenQueue, { durable: true });
    await channel.bindQueue(kitchenQueue, kitchenExchange, 'kitchen.#');

    // Set up delivery events exchange and queue
    await channel.assertExchange(deliveryExchange, 'topic', { durable: true });
    await channel.assertQueue(deliveryQueue, { durable: true });
    await channel.bindQueue(deliveryQueue, deliveryExchange, 'delivery.#');

    // Set up inventory events exchange and queue
    await channel.assertExchange(inventoryExchange, 'topic', { durable: true });
    await channel.assertQueue(inventoryQueue, { durable: true });
    await channel.bindQueue(inventoryQueue, inventoryExchange, 'inventory.#');

    console.log('RabbitMQ connection established');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

export const publishEvent = async (routingKey: string, data: any) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const exchange = ORDER_EXCHANGE;

  try {
    await channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`Event published: ${routingKey}`);
  } catch (error) {
    console.error(`Failed to publish event ${routingKey}:`, error);
    throw error;
  }
};

export const subscribeToInventoryEvents = async (
  callback: (data: { data: any; key: string }) => Promise<void>
) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const inventoryQueue = 'order_inventory_events';

  try {
    console.log('Subscribing to inventory events...');

    channel.consume(inventoryQueue, async (msg: ConsumeMessage | null) => {
      if (msg && channel) {
        try {
          const content = msg.content.toString();
          const key = msg.fields.routingKey;
          const data = JSON.parse(content);
          console.log(`Received inventory event: ${key}`);

          await callback({ data, key });

          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Reject the message and requeue it
          if (channel) {
            channel.nack(msg, false, true);
          }
        }
      }
    });

    console.log('Successfully subscribed to inventory events');
  } catch (error) {
    console.error('Failed to subscribe to inventory events:', error);
    throw error;
  }
};

export const subscribeToKitchenEvents = async (
  callback: (data: { data: any; key: string }) => Promise<void>
) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const kitchenQueue = 'order_kitchen_events';

  try {
    console.log('Subscribing to kitchen events...');

    channel.consume(kitchenQueue, async (msg: ConsumeMessage | null) => {
      if (msg && channel) {
        try {
          const content = msg.content.toString();
          const key = msg.fields.routingKey;
          const data = JSON.parse(content);
          console.log(`Received kitchen event: ${key}`);

          await callback({ data, key });

          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Reject the message and requeue it
          if (channel) {
            channel.nack(msg, false, true);
          }
        }
      }
    });

    console.log('Successfully subscribed to kitchen events');
  } catch (error) {
    console.error('Failed to subscribe to kitchen events:', error);
    throw error;
  }
};

export const subscribeToDeliveryEvents = async (
  callback: (data: { data: any; key: string }) => Promise<void>
) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const deliveryQueue = 'order_delivery_events';

  try {
    console.log('Subscribing to delivery events...');

    channel.consume(deliveryQueue, async (msg: ConsumeMessage | null) => {
      if (msg && channel) {
        try {
          const content = msg.content.toString();
          const key = msg.fields.routingKey;
          const data = JSON.parse(content);
          console.log(`Received delivery event: ${key}`);

          await callback({ data, key });

          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Reject the message and requeue it
          if (channel) {
            channel.nack(msg, false, true);
          }
        }
      }
    });

    console.log('Successfully subscribed to delivery events');
  } catch (error) {
    console.error('Failed to subscribe to delivery events:', error);
    throw error;
  }
};

export const closeRabbitMQ = async () => {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
};
