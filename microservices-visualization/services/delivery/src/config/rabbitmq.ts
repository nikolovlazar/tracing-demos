import { connect } from 'amqplib';
import type { ConsumeMessage } from 'amqplib';

// Use any for now to avoid type issues with amqplib
let channel: any = null;
let connection: any = null;

export const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://app_user:app_password@rabbitmq:5672';
export const DELIVERY_EXCHANGE = 'delivery_exchange';
export const DELIVERY_QUEUE = 'delivery_queue';
export const KITCHEN_EXCHANGE = 'kitchen_exchange';
export const ORDER_EXCHANGE = 'order_exchange';

export const initializeRabbitMQ = async () => {
  try {
    const url = RABBITMQ_URL;
    const kitchenExchange = KITCHEN_EXCHANGE;
    const deliveryExchange = DELIVERY_EXCHANGE;
    const kitchenQueue = DELIVERY_QUEUE;
    const deliveryQueue = DELIVERY_QUEUE;

    connection = await connect(url);
    if (!connection) {
      throw new Error('Failed to connect to RabbitMQ');
    }

    channel = await connection.createChannel();
    if (!channel) {
      throw new Error('Failed to create RabbitMQ channel');
    }

    // Set up kitchen events exchange and queue for consuming
    await channel.assertExchange(kitchenExchange, 'topic', { durable: true });
    await channel.assertQueue(kitchenQueue, { durable: true });
    await channel.bindQueue(
      kitchenQueue,
      kitchenExchange,
      'kitchen.order_ready_for_delivery'
    );

    // Set up delivery events exchange and queue for publishing
    await channel.assertExchange(deliveryExchange, 'topic', { durable: true });
    await channel.assertQueue(deliveryQueue, { durable: true });
    await channel.bindQueue(deliveryQueue, deliveryExchange, 'delivery.#');

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

  const exchange = DELIVERY_EXCHANGE;

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

export const subscribeToKitchenEvents = async (
  callback: (data: { data: any; key: string }) => Promise<void>
) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const kitchenQueue = DELIVERY_QUEUE;

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

export const subscribeToOrderEvents = async (
  callback: (data: { data: any; key: string }) => Promise<void>
) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const orderQueue = 'delivery_order_events';

  try {
    console.log('Subscribing to order events...');

    // Set up order events exchange and queue
    await channel.assertExchange(ORDER_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(orderQueue, { durable: true });
    await channel.bindQueue(
      orderQueue,
      ORDER_EXCHANGE,
      'order.ready_for_delivery'
    );

    channel.consume(orderQueue, async (msg: ConsumeMessage | null) => {
      if (msg && channel) {
        try {
          const content = msg.content.toString();
          const key = msg.fields.routingKey;
          const data = JSON.parse(content);
          console.log(`Received order event: ${key}`);

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

    console.log('Successfully subscribed to order events');
  } catch (error) {
    console.error('Failed to subscribe to order events:', error);
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
