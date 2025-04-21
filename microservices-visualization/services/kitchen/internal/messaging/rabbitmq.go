package messaging

import (
	"context"
	"fmt"
	"kitchen/internal/events"
	"log"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type RabbitMQClient struct {
	conn    *amqp.Connection
	Channel *amqp.Channel
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
		Channel: ch,
	}

	log.Println("✅ AMQP: RabbitMQ client initialized")

	return client, nil

}

func (c *RabbitMQClient) ConsumeEvents(
	ctx context.Context,
	handleReadyForKitchen func(metadata *events.EventMetadata, orderID int32, items []*events.OrderItem) (bool, error),
) error {
	msgs, err := c.Channel.Consume(
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
			switch msg.RoutingKey {
			case "order.ready_for_kitchen":
				var event events.ReadyForKitchenEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal ready for kitchen event: %v", err)
					msg.Nack(false, false)
					continue
				}

				log.Printf("📦 Processing ready for kitchen event for order %d", event.OrderId)

				success, err := handleReadyForKitchen(event.Metadata, event.OrderId, event.Items)
				if err != nil || !success {
					log.Printf("❌ Error handling ready for kitchen event: %v", err)
					msg.Nack(false, true)
					continue
				}

				response := &events.KitchenAcceptedOrderEvent{
					Metadata: &events.EventMetadata{
						TraceId:   event.Metadata.TraceId,
						SpanId:    "",
						Baggage:   event.Metadata.Baggage,
						Timestamp: timestamppb.New(time.Now()),
					},
					OrderId: event.OrderId,
				}

				payload, err := proto.Marshal(response)
				if err != nil {
					log.Printf("❌ AMQP: Failed to marshal kitchen accepted order event: %v", err)
					msg.Nack(false, true)
					continue
				}

				err = c.Channel.Publish(
					"order_events",
					"kitchen.accepted",
					false,
					false,
					amqp.Publishing{
						ContentType:  "application/x-protobuf",
						Body:         payload,
						MessageId:    fmt.Sprintf("order.%d", event.OrderId),
						DeliveryMode: amqp.Persistent,
					},
				)

				if err != nil {
					log.Printf("❌ AMQP: Failed to publish kitchen accepted order event: %v", err)
					msg.Nack(false, true)
					continue
				}

				log.Printf("✅ Order ready for kitchen event handled for order %d", event.OrderId)
				msg.Ack(false)
			}
		}
	}()

	return nil
}

func (c *RabbitMQClient) PublishOrderCooked(ctx context.Context, metadata *events.EventMetadata, orderID int32, items []*events.OrderItem) error {
	payload, err := proto.Marshal(&events.OrderCookedEvent{
		Metadata: &events.EventMetadata{
			TraceId:   metadata.TraceId,
			SpanId:    "",
			Baggage:   metadata.Baggage,
			Timestamp: timestamppb.New(time.Now()),
		},
		OrderId: orderID,
		Items:   items,
	})

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to marshal order cooked event: %v", err)
	}

	err = c.Channel.Publish(
		"order_events",
		"kitchen.order_cooked",
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/x-protobuf",
			Body:         payload,
			MessageId:    fmt.Sprintf("order.%d", orderID),
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
	if c.Channel != nil {
		c.Channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
