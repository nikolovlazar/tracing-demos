import amqp from 'amqplib';

let channel: amqp.Channel | null = null;

export const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://app_user:app_password@rabbitmq:5672';
export const INVENTORY_EXCHANGE = 'inventory_exchange';
export const INVENTORY_QUEUE = 'inventory_queue';
export const ORDER_EXCHANGE = 'order_exchange';

export async function initializeRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ');

    // Set up exchange for publishing events
    await channel.assertExchange(INVENTORY_EXCHANGE, 'topic', {
      durable: true,
    });

    // Set up exchange for consuming events
    await channel.assertExchange(ORDER_EXCHANGE, 'topic', { durable: true });

    // Set up queue for consuming order events
    const queue = await channel.assertQueue(INVENTORY_QUEUE, {
      durable: true,
    });

    // Bind the queue to the order_events exchange with the order.created routing key
    await channel.bindQueue(queue.queue, ORDER_EXCHANGE, 'order.created');

    console.log('RabbitMQ setup completed');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function publishEvent(eventType: string, data: any) {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  try {
    await channel.publish(
      INVENTORY_EXCHANGE,
      eventType,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`Published event: ${eventType}`);
  } catch (error) {
    console.error('Failed to publish event:', error);
    throw error;
  }
}

export async function subscribeToOrderEvents(
  callback: (data: any) => Promise<void>
) {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  try {
    const queue = await channel.assertQueue(INVENTORY_QUEUE, {
      durable: true,
    });

    console.log('Subscribing to order events...');

    channel.consume(queue.queue, async (msg) => {
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
}
