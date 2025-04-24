package messaging

import (
	"context"
	"fmt"
	"log"
	"order/internal/events"
	"order/internal/models"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
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
	handleInventoryReserved func(ctx context.Context, orderID int32, items []*events.OrderItem) (bool, error),
	handleKitchenAccepted func(ctx context.Context, orderID int32) error,
	handleOrderCooked func(ctx context.Context, orderID int32) (*models.Order, error),
	handleDeliveryStarted func(ctx context.Context, orderID int32) error,
	handleDeliveryCompleted func(ctx context.Context, orderID int32) error,
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
			sentryTrace := msg.Headers[sentry.SentryTraceHeader].(string)
			baggage := msg.Headers[sentry.SentryBaggageHeader].(string)
			continueOptions := sentry.ContinueFromHeaders(sentryTrace, baggage)

			processTx := sentry.StartTransaction(ctx, "queue.process", continueOptions)
			processTx.Origin = sentry.SpanOrigin(sentry.SourceTask)
			processTx.SetData("service", "order")
			processTx.SetData("messaging.message.id", msg.MessageId)
			processTx.SetData("messaging.destination.name", msg.Exchange)
			processTx.SetData("messaging.system", "rabbitmq")
			processTx.SetData("messaging.destination.routing_key", msg.RoutingKey)
			processTx.SetData("messaging.message.body.size", len(msg.Body))

			switch msg.RoutingKey {
			case "inventory.reserved":
				unmarshalSpan := processTx.StartChild("deserialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Unmarshal"),
				}...)
				unmarshalSpan.SetData("event.name", "InventoryReservedEvent")
				var event events.InventoryReservedEvent
				err := proto.Unmarshal(msg.Body, &event)
				unmarshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal inventory reserved event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Processing inventory reserved event for order %d", event.OrderId)

				handleInventoryReservedSpan := processTx.StartChild("function", []sentry.SpanOption{
					sentry.WithDescription("handleInventoryReserved"),
				}...)
				success, err := handleInventoryReserved(handleInventoryReservedSpan.Context(), event.OrderId, event.ReservedItems)
				handleInventoryReservedSpan.Finish()
				if err != nil || !success {
					log.Printf("❌ Error handling inventory reserved event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				marshalSpan := processTx.StartChild("serialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Marshal"),
				}...)
				marshalSpan.SetData("event.name", "ReadyForKitchenEvent")
				response := &events.ReadyForKitchenEvent{
					OrderId: event.OrderId,
					Items:   event.ReservedItems,
				}
				payload, err := proto.Marshal(response)
				marshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to marshal ready for kitchen event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				publishSpan := processTx.StartChild("queue.publish", []sentry.SpanOption{
					sentry.WithDescription("order.ready_for_kitchen"),
				}...)
				publishSpan.SetData("messaging.destination.name", "order_events")
				publishSpan.SetData("messaging.destination.routing_key", "order.ready_for_kitchen")
				publishSpan.SetData("messaging.message.id", fmt.Sprintf("ready_for_kitchen.%d", event.OrderId))
				publishSpan.SetData("messaging.message.body.size", len(payload))
				publishSpan.SetData("messaging.system", "rabbitmq")
				err = c.channel.Publish(
					"order_events",
					"order.ready_for_kitchen",
					false, // mandatory
					false, // immediate
					amqp.Publishing{
						ContentType: "application/x-protobuf",
						Body:        payload,
						Headers: amqp.Table{
							sentry.SentryTraceHeader:   publishSpan.ToSentryTrace(),
							sentry.SentryBaggageHeader: publishSpan.ToBaggage(),
						},
						MessageId:    fmt.Sprintf("ready_for_kitchen.%d", event.OrderId),
						DeliveryMode: amqp.Persistent,
					},
				)
				publishSpan.Finish()

				if err != nil {
					log.Printf("❌ Error publishing ready for kitchen event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("✅ Ready for kitchen event published for order %d", event.OrderId)
				msg.Ack(false)
				processTx.Finish()
			case "kitchen.accepted":
				unmarshalSpan := processTx.StartChild("deserialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Unmarshal"),
				}...)
				unmarshalSpan.SetData("event.name", "KitchenAcceptedOrderEvent")
				var event events.KitchenAcceptedOrderEvent
				err := proto.Unmarshal(msg.Body, &event)
				unmarshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal kitchen accepted order event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Processing kitchen accepted order event for order %d", event.OrderId)

				handleKitchenAcceptedSpan := processTx.StartChild("function", []sentry.SpanOption{
					sentry.WithDescription("handleKitchenAccepted"),
				}...)
				err = handleKitchenAccepted(handleKitchenAcceptedSpan.Context(), event.OrderId)
				handleKitchenAcceptedSpan.Finish()
				if err != nil {
					log.Printf("❌ Error handling kitchen accepted order event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("✅ Kitchen accepted order event processed for order %d", event.OrderId)
				msg.Ack(false)
				processTx.Finish()
			case "kitchen.order_cooked":
				unmarshalSpan := processTx.StartChild("deserialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Unmarshal"),
				}...)
				unmarshalSpan.SetData("event.name", "OrderCookedEvent")
				var event events.OrderCookedEvent
				err := proto.Unmarshal(msg.Body, &event)
				unmarshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal order cooked event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Processing order cooked event for order %d", event.OrderId)

				handleOrderCookedSpan := processTx.StartChild("function", []sentry.SpanOption{
					sentry.WithDescription("handleOrderCooked"),
				}...)
				order, err := handleOrderCooked(handleOrderCookedSpan.Context(), event.OrderId)
				handleOrderCookedSpan.Finish()
				if err != nil {
					log.Printf("❌ Error handling order cooked event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				marshalSpan := processTx.StartChild("serialize", []sentry.SpanOption{
					sentry.WithDescription("proto.Marshal"),
				}...)
				marshalSpan.SetData("event.name", "OrderReadyForDeliveryEvent")
				response := &events.OrderReadyForDeliveryEvent{
					OrderId:         event.OrderId,
					Items:           event.Items,
					DeliveryAddress: order.DeliveryAddress,
					CustomerId:      order.CustomerID,
				}
				payload, err := proto.Marshal(response)
				marshalSpan.Finish()
				if err != nil {
					log.Printf("❌ AMQP: Failed to marshal order ready for delivery event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				publishSpan := processTx.StartChild("queue.publish", []sentry.SpanOption{
					sentry.WithDescription("order.ready_for_delivery"),
				}...)
				publishSpan.SetData("messaging.destination.name", "order_events")
				publishSpan.SetData("messaging.destination.routing_key", "order.ready_for_delivery")
				publishSpan.SetData("messaging.message.id", fmt.Sprintf("order.%d", event.OrderId))
				publishSpan.SetData("messaging.message.body.size", len(payload))
				publishSpan.SetData("messaging.system", "rabbitmq")

				// Use the process span's trace info for the next service to continue from
				err = c.channel.Publish(
					"order_events",
					"order.ready_for_delivery",
					false, // mandatory
					false, // immediate
					amqp.Publishing{
						ContentType: "application/x-protobuf",
						Body:        payload,
						Headers: amqp.Table{
							sentry.SentryTraceHeader:   publishSpan.ToSentryTrace(),
							sentry.SentryBaggageHeader: publishSpan.ToBaggage(),
						},
						MessageId:    fmt.Sprintf("order.%d", event.OrderId),
						DeliveryMode: amqp.Persistent,
					},
				)
				publishSpan.Finish()

				if err != nil {
					log.Printf("❌ Error publishing order ready for delivery event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("✅ Order ready for delivery event published for order %d", event.OrderId)
				msg.Ack(false)
				processTx.Finish()
			case "delivery.started":
				var event events.DeliveryStartedEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal delivery started event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Processing delivery started event for order %d", event.OrderId)

				err = handleDeliveryStarted(processTx.Context(), event.OrderId)
				if err != nil {
					log.Printf("❌ Error handling delivery started event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("✅ Delivery started event processed for order %d", event.OrderId)
				msg.Ack(false)
				processTx.Finish()
			case "delivery.completed":
				var event events.DeliveryCompletedEvent
				err := proto.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ AMQP: Failed to unmarshal delivery completed event: %v", err)
					msg.Nack(false, false)
					processTx.Finish()
					continue
				}

				log.Printf("📦 Processing delivery completed event for order %d", event.OrderId)

				err = handleDeliveryCompleted(processTx.Context(), event.OrderId)
				if err != nil {
					log.Printf("❌ Error handling delivery completed event: %v", err)
					msg.Nack(false, true)
					processTx.Finish()
					continue
				}

				log.Printf("✅ Delivery completed event processed for order %d", event.OrderId)
				msg.Ack(false)
				processTx.Finish()
			}
		}
	}()

	return nil
}

func (c *RabbitMQClient) PublishOrderCreated(ctx context.Context, order *models.Order) error {
	parentSpan := sentry.SpanFromContext(ctx)

	items := make([]*events.OrderItem, len(order.Items))
	for i, item := range order.Items {
		items[i] = &events.OrderItem{
			Id:       int32(item.Id),
			Quantity: int32(item.Quantity),
		}
	}

	event := &events.OrderCreatedEvent{
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

	publishSpan := parentSpan.StartChild("queue.publish", []sentry.SpanOption{
		sentry.WithDescription("order.created"),
	}...)
	publishSpan.SetData("messaging.destination.name", "order_events")
	publishSpan.SetData("messaging.destination.routing_key", "order.created")
	publishSpan.SetData("messaging.message.id", fmt.Sprintf("order.%d", order.Id))
	publishSpan.SetData("messaging.message.body.size", len(payload))
	publishSpan.SetData("messaging.system", "rabbitmq")
	err = c.channel.Publish(
		"order_events",
		"order.created",
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType: "application/x-protobuf",
			Body:        payload,
			Headers: amqp.Table{
				sentry.SentryTraceHeader:   publishSpan.ToSentryTrace(),
				sentry.SentryBaggageHeader: publishSpan.ToBaggage(),
			},
			MessageId:    fmt.Sprintf("order.%d", order.Id),
			Timestamp:    time.Now(),
			DeliveryMode: amqp.Persistent,
		},
	)
	publishSpan.Finish()

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
