package handlers

import (
	"context"
	"fmt"
	"kitchen/internal/events"
	"kitchen/internal/messaging"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
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

func (h *KitchenHandler) HandleReadyForKitchen(ctx context.Context, orderID int32, items []*events.OrderItem) (bool, error) {
	log.Printf("📦 Processing ready for kitchen event for order %d", orderID)
	// Get the incoming trace context
	parentSpan := sentry.SpanFromContext(ctx)

	go func() {
		hub := sentry.GetHubFromContext(ctx)
		if hub == nil {
			hub = sentry.CurrentHub().Clone()
		}
		goCtx := sentry.SetHubOnContext(context.Background(), hub)

		cookingTx := sentry.StartTransaction(
			goCtx,
			"cooking",
			sentry.ContinueFromHeaders(
				parentSpan.ToSentryTrace(),
				parentSpan.ToBaggage(),
			),
		)
		cookingTx.Source = sentry.SourceTask

		cookingTx.StartChild("mark", []sentry.SpanOption{
			sentry.WithDescription(fmt.Sprintf("kitchen.started-cooking-%d", orderID)),
		}...).Finish()

		// Simulate cooking time
		time.Sleep(time.Duration(rand.Intn(15000)+20000) * time.Millisecond)

		cookingTx.StartChild("mark", []sentry.SpanOption{
			sentry.WithDescription(fmt.Sprintf("kitchen.finished-cooking-%d", orderID)),
		}...).Finish()

		log.Printf("✅ Order %d cooked", orderID)

		// Publish the cooked event using the cooking finish transaction's context
		err := h.queue.PublishOrderCooked(cookingTx.Context(), orderID, items)
		if err != nil {
			log.Printf("❌ AMQP: Failed to publish order cooked event: %v", err)
			cookingTx.Finish()
			return
		}

		log.Printf("✅ AMQP: Order cooked event published for order %d", orderID)
		cookingTx.Finish()
	}()

	return true, nil
}
