package messaging

import (
	"context"
	"fmt"
	"inventory/internal/events"
	"log"
	"os"

	"github.com/getsentry/sentry-go"
	amqp "github.com/rabbitmq/amqp091-go"
	"google.golang.org/protobuf/proto"
)

type RabbitMQClient struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewRabbitMQClient() (*RabbitMQClient, error) {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://admin:admin@localhost:5672"
	}

	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("❌ AMQP: Failed to connect to RabbitMQ: %v", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("❌ AMQP: Failed to open channel: %v", err)
	}

	err = ch.ExchangeDeclare(
		"order_events",
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)

	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("❌ AMQP: Failed to declare exchange: %v", err)
	}

	q, err := ch.QueueDeclare(
		"inventory_service_events",
		true,
		false,
		false,
		false,
		nil,
	)

	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("❌ AMQP: Failed to declare queue: %v", err)
	}

	err = ch.QueueBind(
		q.Name,
		"order.created",
		"order_events",
		false,
		nil,
	)

	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("❌ AMQP: Failed to bind queue: %v", err)
	}

	client := &RabbitMQClient{
		conn:    conn,
		channel: ch,
	}

	log.Println("✅ AMQP: RabbitMQ client initialized")

	return client, nil
}

func (c *RabbitMQClient) ConsumeEvents(
	ctx context.Context,
	handleInventoryCheck func(ctx context.Context, orderID int32, items []*events.OrderItem) (bool, string, error),
) error {
	msgs, err := c.channel.Consume(
		"inventory_service_events",
		"",    // consumer
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to register consumer: %v", err)
	}

	go func() {
		for msg := range msgs {
			sentryTrace := msg.Headers[sentry.SentryTraceHeader].(string)
			baggage := msg.Headers[sentry.SentryBaggageHeader].(string)
			continueOptions := sentry.ContinueFromHeaders(sentryTrace, baggage)

			processTx := sentry.StartTransaction(ctx, "queue.process", continueOptions)
			processTx.SetData("service", "inventory")
			processTx.SetData("messaging.message.id", msg.MessageId)
			processTx.SetData("messaging.destination.name", msg.Exchange)
			processTx.SetData("messaging.system", "rabbitmq")
			processTx.SetData("messaging.destination.routing_key", msg.RoutingKey)
			processTx.SetData("messaging.message.body.size", len(msg.Body))

			switch msg.RoutingKey {
			case "order.created":
				unmarshalSpan := processTx.StartChild("deserialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Unmarshal"),
				}...)
				unmarshalSpan.SetData("event.name", "OrderCreatedEvent")
				var event events.OrderCreatedEvent
				err := proto.Unmarshal(msg.Body, &event)
				unmarshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal order created event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Processing order %d for inventory check", event.OrderId)

				handleInventoryCheckSpan := processTx.StartChild("function", []sentry.SpanOption{
					sentry.WithDescription("handleInventoryCheck"),
				}...)
				success, message, err := handleInventoryCheck(handleInventoryCheckSpan.Context(), event.OrderId, event.Items)
				handleInventoryCheckSpan.Finish()
				if err != nil {
					log.Printf("Error checking inventory: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				marshalSpan := processTx.StartChild("serialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Marshal"),
				}...)
				marshalSpan.SetData("event.name", "InventoryReservedEvent")
				response := &events.InventoryReservedEvent{
					OrderId:       event.OrderId,
					Success:       success,
					Message:       message,
					ReservedItems: event.Items,
				}
				payload, err := proto.Marshal(response)
				marshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to marshal inventory reserved event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				publishSpan := processTx.StartChild("queue.publish", []sentry.SpanOption{
					sentry.WithDescription("inventory.reserved"),
				}...)
				publishSpan.SetData("messaging.destination.name", "order_events")
				publishSpan.SetData("messaging.destination.routing_key", "inventory.reserved")
				publishSpan.SetData("messaging.message.id", fmt.Sprintf("inventory.%d", event.OrderId))
				publishSpan.SetData("messaging.message.body.size", len(payload))
				publishSpan.SetData("messaging.system", "rabbitmq")
				err = c.channel.Publish(
					"order_events",
					"inventory.reserved",
					false, // mandatory
					false, // immediate
					amqp.Publishing{
						ContentType: "application/x-protobuf",
						Body:        payload,
						Headers: amqp.Table{
							sentry.SentryTraceHeader:   publishSpan.ToSentryTrace(),
							sentry.SentryBaggageHeader: publishSpan.ToBaggage(),
						},
						MessageId:    fmt.Sprintf("inventory.%d", event.OrderId),
						DeliveryMode: amqp.Persistent,
					})
				publishSpan.Finish()

				if err != nil {
					log.Printf("Error publishing response: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("✅ Inventory check completed for order %d: %v", event.OrderId, success)
				msg.Ack(false) // acknowledge the original message
				processTx.Finish()
			}
		}
	}()

	return nil
}

func (c *RabbitMQClient) Close() {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
