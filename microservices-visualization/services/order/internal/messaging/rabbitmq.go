package messaging

import (
	"context"
	"fmt"
	"log"
	"order/internal/events"
	"order/internal/models"
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

func bindQueue(ch *amqp.Channel, queueName string, routingKey string) error {
	return ch.QueueBind(
		queueName,
		routingKey,
		"order_events",
		false, // no-wait
		nil,   // arguments
	)
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
		"order_service_events",
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

	routingKeys := []string{
		"inventory.reserved",
		"kitchen.accepted",
		"kitchen.order_cooked",
		"delivery.started",
		"delivery.completed",
	}

	for _, key := range routingKeys {
		err = bindQueue(ch, q.Name, key)
		if err != nil {
			ch.Close()
			conn.Close()
			return nil, fmt.Errorf("❌ AMQP: Failed to bind queue: %v", err)
		}
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
	handleInventoryReserved func(orderID int32, items []*events.OrderItem) (bool, error),
	handleKitchenAccepted func(orderID int32) error,
	handleOrderCooked func(orderID int32) (*models.Order, error),
	handleDeliveryStarted func(orderID int32) error,
	handleDeliveryCompleted func(orderID int32) error,
) error {
	msgs, err := c.channel.Consume(
		"order_service_events",
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
			case "inventory.reserved":
				var event events.InventoryReservedEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal inventory reserved event: %v", err)
					msg.Nack(false, false)
					continue
				}

				log.Printf("📦 Processing inventory reserved event for order %d", event.OrderId)

				success, err := handleInventoryReserved(event.OrderId, event.ReservedItems)
				if err != nil || !success {
					log.Printf("❌ Error handling inventory reserved event: %v", err)
					msg.Nack(false, true)
					continue
				}

				response := &events.ReadyForKitchenEvent{
					Metadata: &events.EventMetadata{
						TraceId:   event.Metadata.TraceId,
						SpanId:    "",
						Baggage:   event.Metadata.Baggage,
						Timestamp: timestamppb.New(time.Now()),
					},
					OrderId: event.OrderId,
					Items:   event.ReservedItems,
				}

				payload, err := proto.Marshal(response)
				if err != nil {
					log.Printf("❌ AMQP: Failed to marshal ready for kitchen event: %v", err)
					msg.Nack(false, false)
					continue
				}

				err = c.channel.Publish(
					"order_events",
					"order.ready_for_kitchen",
					false, // mandatory
					false, // immediate
					amqp.Publishing{
						ContentType:  "application/x-protobuf",
						Body:         payload,
						MessageId:    fmt.Sprintf("ready_for_kitchen.%d", event.OrderId),
						DeliveryMode: amqp.Persistent,
					},
				)

				if err != nil {
					log.Printf("❌ Error publishing ready for kitchen event: %v", err)
					msg.Nack(false, true)
					continue
				}

				log.Printf("✅ Ready for kitchen event published for order %d", event.OrderId)
				msg.Ack(false)
			case "kitchen.accepted":
				var event events.KitchenAcceptedOrderEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal kitchen accepted order event: %v", err)
					msg.Nack(false, false)
					continue
				}

				log.Printf("📦 Processing kitchen accepted order event for order %d", event.OrderId)

				err = handleKitchenAccepted(event.OrderId)
				if err != nil {
					log.Printf("❌ Error handling kitchen accepted order event: %v", err)
					msg.Nack(false, true)
					continue
				}

				log.Printf("✅ Kitchen accepted order event processed for order %d", event.OrderId)
				msg.Ack(false)
			case "kitchen.order_cooked":
				var event events.OrderCookedEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal order cooked event: %v", err)
					msg.Nack(false, false)
					continue
				}

				log.Printf("📦 Processing order cooked event for order %d", event.OrderId)

				order, err := handleOrderCooked(event.OrderId)
				if err != nil {
					log.Printf("❌ Error handling order cooked event: %v", err)
					msg.Nack(false, true)
					continue
				}

				response := &events.OrderReadyForDeliveryEvent{
					Metadata: &events.EventMetadata{
						TraceId:   event.Metadata.TraceId,
						SpanId:    "",
						Baggage:   event.Metadata.Baggage,
						Timestamp: timestamppb.New(time.Now()),
					},
					OrderId:         event.OrderId,
					Items:           event.Items,
					DeliveryAddress: order.DeliveryAddress,
					CustomerId:      order.CustomerID,
				}

				payload, err := proto.Marshal(response)
				if err != nil {
					log.Printf("❌ AMQP: Failed to marshal order ready for delivery event: %v", err)
					msg.Nack(false, false)
					continue
				}

				err = c.channel.Publish(
					"order_events",
					"order.ready_for_delivery",
					false, // mandatory
					false, // immediate
					amqp.Publishing{
						ContentType:  "application/x-protobuf",
						Body:         payload,
						MessageId:    fmt.Sprintf("order.%d", event.OrderId),
						DeliveryMode: amqp.Persistent,
					},
				)

				if err != nil {
					log.Printf("❌ Error publishing order ready for delivery event: %v", err)
					msg.Nack(false, true)
					continue
				}

				log.Printf("✅ Order ready for delivery event published for order %d", event.OrderId)
				msg.Ack(false)
			case "delivery.started":
				var event events.DeliveryStartedEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal delivery started event: %v", err)
					msg.Nack(false, false)
					continue
				}

				log.Printf("📦 Processing delivery started event for order %d", event.OrderId)

				err = handleDeliveryStarted(event.OrderId)
				if err != nil {
					log.Printf("❌ Error handling delivery started event: %v", err)
					msg.Nack(false, true)
					continue
				}

				log.Printf("✅ Delivery started event processed for order %d", event.OrderId)
				msg.Ack(false)
			case "delivery.completed":
				var event events.DeliveryCompletedEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal delivery completed event: %v", err)
					msg.Nack(false, false)
					continue
				}

				log.Printf("📦 Processing delivery completed event for order %d", event.OrderId)

				err = handleDeliveryCompleted(event.OrderId)
				if err != nil {
					log.Printf("❌ Error handling delivery completed event: %v", err)
					msg.Nack(false, true)
					continue
				}

				log.Printf("✅ Delivery completed event processed for order %d", event.OrderId)
				msg.Ack(false)
			}
		}
	}()

	return nil
}

func (c *RabbitMQClient) PublishOrderCreated(ctx context.Context, order *models.Order) error {
	items := make([]*events.OrderItem, len(order.Items))
	for i, item := range order.Items {
		items[i] = &events.OrderItem{
			Id:       int32(item.Id),
			Quantity: int32(item.Quantity),
		}
	}

	event := &events.OrderCreatedEvent{
		Metadata: &events.EventMetadata{
			TraceId:   "",
			SpanId:    "",
			Baggage:   make(map[string]string),
			Timestamp: timestamppb.Now(),
		},
		OrderId:    int32(order.Id),
		CustomerId: order.CustomerID,
		Status:     order.Status,
		CreatedAt:  timestamppb.New(order.CreatedAt),
		Items:      items,
	}

	payload, err := proto.Marshal(event)
	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to marshal order created event: %v", err)
	}

	err = c.channel.Publish(
		"order_events",
		"order.created",
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/x-protobuf",
			Body:         payload,
			MessageId:    fmt.Sprintf("order.%d", order.Id),
			Timestamp:    time.Now(),
			DeliveryMode: amqp.Persistent,
		},
	)

	if err != nil {
		return fmt.Errorf("❌ AMQP: Failed to publish order created event: %v", err)
	}

	log.Printf("✅ AMQP: Order created event published for order %d", order.Id)
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
