package messaging

import (
	"context"
	"fmt"
	"kitchen/internal/events"
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
		"kitchen_service_events",
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
		"order.ready_for_kitchen",
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
	handleReadyForKitchen func(ctx context.Context, orderID int32, items []*events.OrderItem) (bool, error),
) error {
	msgs, err := c.channel.Consume(
		"kitchen_service_events",
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
			processTx.SetData("service", "kitchen")
			processTx.SetData("messaging.message.id", msg.MessageId)
			processTx.SetData("messaging.destination.name", msg.Exchange)
			processTx.SetData("messaging.system", "rabbitmq")
			processTx.SetData("messaging.destination.routing_key", msg.RoutingKey)
			processTx.SetData("messaging.message.body.size", len(msg.Body))

			switch msg.RoutingKey {
			case "order.ready_for_kitchen":
				unmarshalSpan := processTx.StartChild("deserialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Unmarshal"),
				}...)
				unmarshalSpan.SetData("event.name", "ReadyForKitchenEvent")
				var event events.ReadyForKitchenEvent
				err := proto.Unmarshal(msg.Body, &event)
				unmarshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal ready for kitchen event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Accepting order %d", event.OrderId)

				marshalSpan := processTx.StartChild("serialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Marshal"),
				}...)
				marshalSpan.SetData("event.name", "KitchenAcceptedOrderEvent")
				response := &events.KitchenAcceptedOrderEvent{
					OrderId: event.OrderId,
				}
				payload, err := proto.Marshal(response)
				marshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to marshal kitchen accepted order event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				publishSpan := processTx.StartChild("queue.publish", []sentry.SpanOption{
					sentry.WithDescription("kitchen.accepted"),
				}...)
				publishSpan.SetData("messaging.destination.name", "order_events")
				publishSpan.SetData("messaging.destination.routing_key", "kitchen.accepted")
				publishSpan.SetData("messaging.message.id", fmt.Sprintf("kitchen.%d", event.OrderId))
				publishSpan.SetData("messaging.message.body.size", len(payload))
				publishSpan.SetData("messaging.system", "rabbitmq")
				err = c.channel.Publish(
					"order_events",
					"kitchen.accepted",
					false, // mandatory
					false, // immediate
					amqp.Publishing{
						ContentType: "application/x-protobuf",
						Body:        payload,
						Headers: amqp.Table{
							sentry.SentryTraceHeader:   publishSpan.ToSentryTrace(),
							sentry.SentryBaggageHeader: publishSpan.ToBaggage(),
						},
						MessageId:    fmt.Sprintf("kitchen.%d", event.OrderId),
						DeliveryMode: amqp.Persistent,
					},
				)
				publishSpan.Finish()

				if err != nil {
					log.Printf("❌ Error publishing kitchen accepted order event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Processing ready for kitchen event for order %d", event.OrderId)

				handleReadyForKitchenSpan := processTx.StartChild("function", []sentry.SpanOption{
					sentry.WithDescription("handleReadyForKitchen"),
				}...)
				success, err := handleReadyForKitchen(handleReadyForKitchenSpan.Context(), event.OrderId, event.Items)
				handleReadyForKitchenSpan.Finish()
				if err != nil || !success {
					log.Printf("❌ Error handling ready for kitchen event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("✅ Order ready for kitchen event handled for order %d", event.OrderId)
				msg.Ack(false)
				processTx.Finish()
			}
		}
	}()

	return nil
}

func (c *RabbitMQClient) PublishOrderCooked(ctx context.Context, orderID int32, items []*events.OrderItem) error {
	// Get the cooking span from context - this should be our parent span
	parentSpan := sentry.SpanFromContext(ctx)

	// Create a publish span as a child of the cooking span
	publishSpan := parentSpan.StartChild("queue.publish", []sentry.SpanOption{
		sentry.WithDescription("kitchen.order_cooked"),
	}...)
	defer publishSpan.Finish()

	publishSpan.SetData("messaging.destination.name", "order_events")
	publishSpan.SetData("messaging.destination.routing_key", "kitchen.order_cooked")
	publishSpan.SetData("messaging.message.id", fmt.Sprintf("kitchen.%d", orderID))
	publishSpan.SetData("messaging.system", "rabbitmq")

	payload, err := proto.Marshal(&events.OrderCookedEvent{
		OrderId: orderID,
		Items:   items,
	})

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to marshal order cooked event: %v", err)
	}

	publishSpan.SetData("messaging.message.body.size", len(payload))

	// Use the parent span's trace info to ensure the cooking span is propagated
	err = c.channel.Publish(
		"order_events",
		"kitchen.order_cooked",
		false,
		false,
		amqp.Publishing{
			ContentType: "application/x-protobuf",
			Body:        payload,
			Headers: amqp.Table{
				sentry.SentryTraceHeader:   publishSpan.ToSentryTrace(),
				sentry.SentryBaggageHeader: publishSpan.ToBaggage(),
			},
			MessageId:    fmt.Sprintf("kitchen.%d", orderID),
			DeliveryMode: amqp.Persistent,
		},
	)

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to publish order cooked event: %v", err)
	}

	log.Printf("✅ AMQP: Order cooked event published for order %d", orderID)
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
