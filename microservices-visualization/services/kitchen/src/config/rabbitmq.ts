import { connect } from 'amqplib';
import type { ConsumeMessage } from 'amqplib';

// Use any for now to avoid type issues with amqplib
let channel: any = null;
let connection: any = null;

export const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://app_user:app_password@rabbitmq:5672';
export const KITCHEN_EXCHANGE = 'kitchen_exchange';
export const KITCHEN_QUEUE = 'kitchen_queue';
export const ORDER_EXCHANGE = 'order_exchange';
export const DELIVERY_EXCHANGE = 'delivery_exchange';

export const initializeRabbitMQ = async () => {
  try {
    const url = RABBITMQ_URL;
    const orderExchange = ORDER_EXCHANGE;
    const kitchenExchange = KITCHEN_EXCHANGE;
    const orderQueue = KITCHEN_QUEUE;
    const kitchenQueue = KITCHEN_QUEUE;

    connection = await connect(url);
    if (!connection) {
      throw new Error('Failed to connect to RabbitMQ');
    }

    channel = await connection.createChannel();
    if (!channel) {
      throw new Error('Failed to create RabbitMQ channel');
    }

    // Set up order events exchange and queue for consuming
    await channel.assertExchange(orderExchange, 'topic', { durable: true });
    await channel.assertQueue(orderQueue, { durable: true });
    await channel.bindQueue(
      orderQueue,
      orderExchange,
      'order.ready_for_kitchen'
    );

    // Set up kitchen events exchange and queue for publishing
    await channel.assertExchange(kitchenExchange, 'topic', { durable: true });
    await channel.assertQueue(kitchenQueue, { durable: true });
    await channel.bindQueue(kitchenQueue, kitchenExchange, 'kitchen.#');

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

  const exchange = KITCHEN_EXCHANGE;

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

export const subscribeToOrderEvents = async (
  callback: (data: { data: any; key: string }) => Promise<void>
) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const orderQueue = KITCHEN_QUEUE;

  try {
    console.log('Subscribing to order events...');

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
