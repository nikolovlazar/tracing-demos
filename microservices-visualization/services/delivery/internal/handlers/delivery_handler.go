package handlers

import (
	"context"
	"delivery/internal/events"
	"delivery/internal/messaging"
	"log"
	"math/rand"
	"net/http"
	"time"
)

type DeliveryHandler struct {
	rabbitmq *messaging.RabbitMQClient
}

func NewDeliveryHandler(rabbitmq *messaging.RabbitMQClient) *DeliveryHandler {
	return &DeliveryHandler{rabbitmq: rabbitmq}
}

func (h *DeliveryHandler) HandleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (h *DeliveryHandler) HandleReadyForDelivery(
	metadata *events.EventMetadata,
	orderID int32,
	items []*events.OrderItem,
	deliveryAddress string,
	customerID string,
) error {
	go func() {
		time.Sleep(time.Duration(rand.Intn(10000)+20000) * time.Millisecond)

		err := h.rabbitmq.PublishDeliveryStarted(context.Background(), &events.EventMetadata{
			TraceId: metadata.TraceId,
			SpanId:  "",
			Baggage: metadata.Baggage,
		}, orderID)
		if err != nil {
			log.Printf("❌ AMQP: Failed to publish delivery started event: %v", err)
		}

		log.Printf("✅ Delivery started event published for order %d", orderID)

		time.Sleep(time.Duration(rand.Intn(10000)+20000) * time.Millisecond)

		err = h.rabbitmq.PublishDeliveryCompleted(context.Background(), &events.EventMetadata{
			TraceId: metadata.TraceId,
			SpanId:  "",
			Baggage: metadata.Baggage,
		}, orderID)
		if err != nil {
			log.Printf("❌ AMQP: Failed to publish delivery completed event: %v", err)
		}

		log.Printf("✅ Delivery completed event published for order %d", orderID)
	}()

	return nil
}
