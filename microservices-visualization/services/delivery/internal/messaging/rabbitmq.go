package messaging

import (
	"context"
	"delivery/internal/events"
	"fmt"
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
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,   // arguments
	)

	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("❌ AMQP: Failed to declare exchange: %v", err)
	}

	q, err := ch.QueueDeclare(
		"delivery_service_events",
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,   // arguments
	)

	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("❌ AMQP: Failed to declare queue: %v", err)
	}

	err = ch.QueueBind(
		q.Name,
		"order.ready_for_delivery",
		"order_events",
		false, // no-wait
		nil,   // arguments
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
	handleReadyForDelivery func(ctx context.Context, orderID int32, items []*events.OrderItem, deliveryAddress string, customerID string) error,
) error {
	msgs, err := c.channel.Consume(
		"delivery_service_events",
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
			sentryTrace := msg.Headers["sentry-trace"].(string)
			baggage := msg.Headers["baggage"].(string)
			continueOptions := sentry.ContinueFromHeaders(sentryTrace, baggage)

			processTx := sentry.StartTransaction(ctx, "queue.process", continueOptions)
			processTx.SetData("service", "delivery")
			processTx.SetData("messaging.message.id", msg.MessageId)
			processTx.SetData("messaging.destination.name", msg.Exchange)
			processTx.SetData("messaging.system", "rabbitmq")
			processTx.SetData("messaging.destination.routing_key", msg.RoutingKey)
			processTx.SetData("messaging.message.body.size", len(msg.Body))

			switch msg.RoutingKey {
			case "order.ready_for_delivery":
				unmarshalSpan := processTx.StartChild("deserialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Unmarshal"),
				}...)
				unmarshalSpan.SetData("event.name", "OrderReadyForDeliveryEvent")
				var event events.OrderReadyForDeliveryEvent
				err := proto.Unmarshal(msg.Body, &event)
				unmarshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal order ready for delivery event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Processing order ready for delivery event for order %d", event.OrderId)

				handleReadyForDeliverySpan := processTx.StartChild("function", []sentry.SpanOption{
					sentry.WithDescription("handleReadyForDelivery"),
				}...)
				err = handleReadyForDelivery(handleReadyForDeliverySpan.Context(), event.OrderId, event.Items, event.DeliveryAddress, event.CustomerId)
				handleReadyForDeliverySpan.Finish()
				if err != nil {
					log.Printf("❌ Error handling order ready for delivery event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("✅ Order ready for delivery event processed for order %d", event.OrderId)
				msg.Ack(false)
				processTx.Finish()
			}
		}
	}()

	return nil
}

func (c *RabbitMQClient) PublishDeliveryStarted(ctx context.Context, orderID int32) error {
	parentSpan := sentry.SpanFromContext(ctx)

	payload, err := proto.Marshal(&events.DeliveryStartedEvent{
		OrderId: orderID,
	})

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to marshal delivery started event: %v", err)
	}

	publishSpan := parentSpan.StartChild("queue.publish", []sentry.SpanOption{
		sentry.WithDescription("delivery.started"),
	}...)
	defer publishSpan.Finish()
	publishSpan.SetData("messaging.destination.name", "order_events")
	publishSpan.SetData("messaging.destination.routing_key", "delivery.started")
	publishSpan.SetData("messaging.message.id", fmt.Sprintf("delivery.%d", orderID))
	publishSpan.SetData("messaging.message.body.size", len(payload))
	publishSpan.SetData("messaging.system", "rabbitmq")
	err = c.channel.Publish(
		"order_events",
		"delivery.started",
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType: "application/x-protobuf",
			Body:        payload,
			Headers: amqp.Table{
				"sentry-trace": parentSpan.ToSentryTrace(),
				"baggage":      parentSpan.ToBaggage(),
			},
			MessageId:    fmt.Sprintf("delivery.%d", orderID),
			DeliveryMode: amqp.Persistent,
		},
	)

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to publish delivery started event: %v", err)
	}

	log.Printf("✅ AMQP: Delivery started event published for order %d", orderID)
	return nil
}

func (c *RabbitMQClient) PublishDeliveryCompleted(ctx context.Context, orderID int32) error {
	parentSpan := sentry.SpanFromContext(ctx)

	payload, err := proto.Marshal(&events.DeliveryCompletedEvent{
		OrderId: orderID,
	})

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to marshal delivery completed event: %v", err)
	}

	publishSpan := parentSpan.StartChild("queue.publish", []sentry.SpanOption{
		sentry.WithDescription("delivery.completed"),
	}...)
	defer publishSpan.Finish()
	publishSpan.SetData("messaging.destination.name", "order_events")
	publishSpan.SetData("messaging.destination.routing_key", "delivery.completed")
	publishSpan.SetData("messaging.message.id", fmt.Sprintf("delivery.%d", orderID))
	publishSpan.SetData("messaging.message.body.size", len(payload))
	publishSpan.SetData("messaging.system", "rabbitmq")
	err = c.channel.Publish(
		"order_events",
		"delivery.completed",
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType: "application/x-protobuf",
			Body:        payload,
			Headers: amqp.Table{
				"sentry-trace": publishSpan.ToSentryTrace(),
				"baggage":      publishSpan.ToBaggage(),
			},
			MessageId:    fmt.Sprintf("delivery.%d", orderID),
			DeliveryMode: amqp.Persistent,
		},
	)

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to publish delivery completed event: %v", err)
	}

	log.Printf("✅ AMQP: Delivery completed event published for order %d", orderID)
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
