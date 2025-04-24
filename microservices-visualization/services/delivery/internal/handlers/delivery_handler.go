package handlers

import (
	"context"
	"delivery/internal/events"
	"delivery/internal/messaging"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
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
	ctx context.Context,
	orderID int32,
	items []*events.OrderItem,
	deliveryAddress string,
	customerID string,
) error {
	parentSpan := sentry.SpanFromContext(ctx)

	go func() {
		hub := sentry.GetHubFromContext(ctx)
		if hub == nil {
			hub = sentry.CurrentHub().Clone()
		}
		goCtx := sentry.SetHubOnContext(context.Background(), hub)

		deliveryTx := sentry.StartTransaction(
			goCtx,
			"delivery",
			sentry.ContinueFromHeaders(
				parentSpan.ToSentryTrace(),
				parentSpan.ToBaggage(),
			),
		)
		deliveryTx.Source = sentry.SourceTask

		assigningSpan := deliveryTx.StartChild("function", []sentry.SpanOption{
			sentry.WithDescription("delivery.assigning-driver"),
		}...)
		assigningSpan.SetData("order.id", orderID)
		time.Sleep(time.Duration(rand.Intn(10000)+20000) * time.Millisecond)
		assigningSpan.SetData("driver.id", "lazar.nikolov")
		assigningSpan.Finish()

		// Publish delivery started using the assigning transaction's context
		err := h.rabbitmq.PublishDeliveryStarted(deliveryTx.Context(), orderID)
		if err != nil {
			log.Printf("❌ AMQP: Failed to publish delivery started event: %v", err)
			deliveryTx.Finish()
			return
		}

		log.Printf("✅ Delivery started event published for order %d", orderID)

		deliveryTx.StartChild("mark", []sentry.SpanOption{
			sentry.WithDescription(fmt.Sprintf("delivery.started-%d", orderID)),
		}...).Finish()

		// Simulate delivery time
		time.Sleep(time.Duration(rand.Intn(10000)+20000) * time.Millisecond)

		deliveryTx.StartChild("mark", []sentry.SpanOption{
			sentry.WithDescription(fmt.Sprintf("delivery.completed-%d", orderID)),
		}...).Finish()

		// Publish delivery completed using the complete transaction's context
		err = h.rabbitmq.PublishDeliveryCompleted(deliveryTx.Context(), orderID)
		if err != nil {
			log.Printf("❌ AMQP: Failed to publish delivery completed event: %v", err)
			deliveryTx.Finish()
			return
		}

		log.Printf("✅ Delivery completed event published for order %d", orderID)
		deliveryTx.Finish()
	}()

	return nil
}
