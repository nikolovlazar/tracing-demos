package handlers

import (
	"context"
	"kitchen/internal/events"
	"kitchen/internal/messaging"
	"log"
	"math/rand"
	"net/http"
	"time"
)

type KitchenHandler struct {
	queue *messaging.RabbitMQClient
}

func NewKitchenHandler(rabbitmq *messaging.RabbitMQClient) *KitchenHandler {
	return &KitchenHandler{queue: rabbitmq}
}

func (h *KitchenHandler) HandleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (h *KitchenHandler) HandleReadyForKitchen(metadata *events.EventMetadata, orderID int32, items []*events.OrderItem) (bool, error) {
	log.Printf("📦 Processing ready for kitchen event for order %d", orderID)

	// Put in a different thread to simulate cooking and not blocking the main thread
	go func() {
		// Wait for 15-20 seconds to simulate cooking
		time.Sleep(time.Duration(rand.Intn(15000)+20000) * time.Millisecond)

		log.Printf("✅ Order %d cooked", orderID)

		err := h.queue.PublishOrderCooked(context.Background(), metadata, orderID, items)

		if err != nil {
			log.Printf("❌ AMQP: Failed to publish order cooked event: %v", err)
			return
		}

		log.Printf("✅ AMQP: Order cooked event published for order %d", orderID)
	}()

	return true, nil
}
