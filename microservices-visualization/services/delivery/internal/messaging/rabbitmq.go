package messaging

import (
	"context"
	"delivery/internal/events"
	"fmt"
	"log"
	"os"

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
	handleReadyForDelivery func(metadata *events.EventMetadata, orderID int32, items []*events.OrderItem, deliveryAddress string, customerID string) error,
) error {
	msgs, err := c.channel.Consume(
		"delivery_service_events",
		"",
		false,
		false,
		false,
		false,
		nil,
	)

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to register consumer: %v", err)
	}

	go func() {
		for msg := range msgs {
			switch msg.RoutingKey {
			case "order.ready_for_delivery":
				var event events.OrderReadyForDeliveryEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal order ready for delivery event: %v", err)
					msg.Nack(false, false)
					continue
				}

				log.Printf("📦 Processing order ready for delivery event for order %d", event.OrderId)

				err = handleReadyForDelivery(event.Metadata, event.OrderId, event.Items, event.DeliveryAddress, event.CustomerId)
				if err != nil {
					log.Printf("❌ Error handling order ready for delivery event: %v", err)
				}

				log.Printf("✅ Order ready for delivery event processed for order %d", event.OrderId)
				msg.Ack(false)
			}
		}
	}()

	return nil
}

func (c *RabbitMQClient) PublishDeliveryStarted(ctx context.Context, metadata *events.EventMetadata, orderID int32) error {
	payload, err := proto.Marshal(&events.DeliveryStartedEvent{
		Metadata: &events.EventMetadata{
			TraceId: metadata.TraceId,
			SpanId:  metadata.SpanId,
			Baggage: metadata.Baggage,
		},
		OrderId: orderID,
	})

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to marshal delivery started event: %v", err)
	}

	return c.channel.Publish(
		"order_events",
		"delivery.started",
		false,
		false,
		amqp.Publishing{
			ContentType: "application/protobuf",
			Body:        payload,
		},
	)
}

func (c *RabbitMQClient) PublishDeliveryCompleted(ctx context.Context, metadata *events.EventMetadata, orderID int32) error {
	payload, err := proto.Marshal(&events.DeliveryCompletedEvent{
		Metadata: &events.EventMetadata{
			TraceId: metadata.TraceId,
			SpanId:  metadata.SpanId,
			Baggage: metadata.Baggage,
		},
		OrderId: orderID,
	})

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to marshal delivery completed event: %v", err)
	}

	return c.channel.Publish(
		"order_events",
		"delivery.completed",
		false,
		false,
		amqp.Publishing{
			ContentType: "application/protobuf",
			Body:        payload,
		},
	)
}

func (c *RabbitMQClient) Close() {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
