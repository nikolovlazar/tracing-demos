package messaging

import (
	"context"
	"fmt"
	"inventory/internal/events"
	"log"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
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
	handleInventoryCheck func(orderID int32, items []*events.OrderItem) (bool, string, error),
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
			switch msg.RoutingKey {
			case "order.created":
				var event events.OrderCreatedEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal order created event: %v", err)
					msg.Nack(false, false)
					continue
				}

				log.Printf("📦 Processing order %d for inventory check", event.OrderId)

				success, message, err := handleInventoryCheck(event.OrderId, event.Items)
				if err != nil {
					log.Printf("Error checking inventory: %v", err)
					msg.Nack(false, true)
					continue
				}

				response := &events.InventoryReservedEvent{
					Metadata: &events.EventMetadata{
						TraceId:   event.Metadata.TraceId,
						SpanId:    "",
						Baggage:   event.Metadata.Baggage,
						Timestamp: timestamppb.New(time.Now()),
					},
					OrderId:       event.OrderId,
					Success:       success,
					Message:       message,
					ReservedItems: event.Items,
				}

				payload, err := proto.Marshal(response)
				if err != nil {
					log.Printf("❌ AMQP: Failed to marshal inventory reserved event: %v", err)
					msg.Nack(false, false)
					continue
				}

				err = c.channel.Publish(
					"order_events",
					"inventory.reserved",
					false, // mandatory
					false, // immediate
					amqp.Publishing{
						ContentType:  "application/x-protobuf",
						Body:         payload,
						MessageId:    fmt.Sprintf("inventory.%d", event.OrderId),
						DeliveryMode: amqp.Persistent,
					})

				if err != nil {
					log.Printf("Error publishing response: %v", err)
					msg.Nack(false, true)
					continue
				}

				log.Printf("✅ Inventory check completed for order %d: %v", event.OrderId, success)
				msg.Ack(false) // acknowledge the original message
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
