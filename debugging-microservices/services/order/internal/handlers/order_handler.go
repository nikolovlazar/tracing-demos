package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"order/internal/events"
	"order/internal/messaging"
	"order/internal/models"
	"order/internal/repository"

	"github.com/getsentry/sentry-go"
)

type OrderHandler struct {
	orderRepo *repository.OrderRepository
	queue     *messaging.RabbitMQClient
}

func NewOrderHandler(orderRepo *repository.OrderRepository, queue *messaging.RabbitMQClient) *OrderHandler {
	return &OrderHandler{
		orderRepo: orderRepo,
		queue:     queue,
	}
}

func (h *OrderHandler) HandleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (h *OrderHandler) HandleOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		h.createOrder(w, r)
	}
}

func (h *OrderHandler) HandleInventoryReserved(ctx context.Context, orderID int32, items []*events.OrderItem) (bool, error) {
	err := h.orderRepo.UpdateOrderStatus(ctx, orderID, "waiting_for_kitchen")
	if err != nil {
		return false, err
	}

	return true, nil
}

func (h *OrderHandler) HandleKitchenAccepted(ctx context.Context, orderID int32) error {
	err := h.orderRepo.UpdateOrderStatus(ctx, orderID, "waiting_for_kitchen")
	if err != nil {
		return err
	}
	return nil
}

func (h *OrderHandler) HandleOrderCooked(ctx context.Context, orderID int32) (*models.Order, error) {
	err := h.orderRepo.UpdateOrderStatus(ctx, orderID, "ready_for_delivery")
	if err != nil {
		return nil, err
	}

	order, err := h.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	return order, nil
}

func (h *OrderHandler) HandleDeliveryStarted(ctx context.Context, orderID int32) error {
	err := h.orderRepo.UpdateOrderStatus(ctx, orderID, "delivery_started")
	if err != nil {
		return err
	}
	return nil
}

func (h *OrderHandler) HandleDeliveryCompleted(ctx context.Context, orderID int32) error {
	err := h.orderRepo.UpdateOrderStatus(ctx, orderID, "delivery_completed")
	if err != nil {
		return err
	}
	return nil
}

func (h *OrderHandler) createOrder(w http.ResponseWriter, r *http.Request) {
	sentryTrace := r.Header.Get(sentry.SentryTraceHeader)
	baggage := r.Header.Get(sentry.SentryBaggageHeader)

	log.Println("sentryTrace: ", sentryTrace)
	log.Println("baggage: ", baggage)

	ctx := r.Context()
	hub := sentry.GetHubFromContext(ctx)
	continueOptions := sentry.ContinueTrace(hub, sentryTrace, baggage)

	transaction := sentry.StartTransaction(r.Context(), "http.server", continueOptions)
	transaction.Description = fmt.Sprintf("%s %s", r.Method, r.URL.Path)

	decodeSpan := transaction.StartChild("deserialize", []sentry.SpanOption{
		sentry.WithDescription("CreateOrderRequest"),
	}...)
	var createOrderReq models.CreateOrderRequest
	err := json.NewDecoder(r.Body).Decode(&createOrderReq)
	decodeSpan.Finish()
	if err != nil {
		sentry.CaptureException(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	createOrderSpan := transaction.StartChild("function", []sentry.SpanOption{
		sentry.WithDescription("orderRepo.CreateOrder"),
	}...)
	order, err := h.orderRepo.CreateOrder(createOrderSpan.Context(), &createOrderReq)
	createOrderSpan.Finish()

	if err != nil {
		sentry.CaptureException(err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	publishOrderCreatedSpan := transaction.StartChild("function", []sentry.SpanOption{
		sentry.WithDescription("queue.PublishOrderCreated"),
	}...)
	err = h.queue.PublishOrderCreated(publishOrderCreatedSpan.Context(), order)
	publishOrderCreatedSpan.Finish()
	if err != nil {
		sentry.CaptureException(err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	encodeSpan := transaction.StartChild("serialize", []sentry.SpanOption{
		sentry.WithDescription("order"),
	}...)
	encodeSpan.SetData("order.id", order.Id)
	json.NewEncoder(w).Encode(order)
	encodeSpan.Finish()

	w.WriteHeader(http.StatusCreated)
}
