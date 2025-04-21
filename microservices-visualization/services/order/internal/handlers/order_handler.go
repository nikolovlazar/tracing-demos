package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"order/internal/events"
	"order/internal/messaging"
	"order/internal/models"
	"order/internal/repository"
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
		log.Println("CreateOrder")
		h.createOrder(w, r)
	}
}

func (h *OrderHandler) HandleInventoryReserved(orderID int32, items []*events.OrderItem) (bool, error) {
	err := h.orderRepo.UpdateOrderStatus(orderID, "waiting_for_kitchen")
	if err != nil {
		return false, err
	}

	return true, nil
}

func (h *OrderHandler) HandleKitchenAccepted(orderID int32) error {
	err := h.orderRepo.UpdateOrderStatus(orderID, "waiting_for_kitchen")
	if err != nil {
		return err
	}
	return nil
}

func (h *OrderHandler) HandleOrderCooked(orderID int32) (*models.Order, error) {
	err := h.orderRepo.UpdateOrderStatus(orderID, "ready_for_delivery")
	if err != nil {
		return nil, err
	}

	order, err := h.orderRepo.GetOrder(orderID)
	if err != nil {
		return nil, err
	}

	return order, nil
}

func (h *OrderHandler) HandleDeliveryStarted(orderID int32) error {
	err := h.orderRepo.UpdateOrderStatus(orderID, "delivery_started")
	if err != nil {
		return err
	}
	return nil
}

func (h *OrderHandler) HandleDeliveryCompleted(orderID int32) error {
	err := h.orderRepo.UpdateOrderStatus(orderID, "delivery_completed")
	if err != nil {
		return err
	}
	return nil
}

func (h *OrderHandler) createOrder(w http.ResponseWriter, r *http.Request) {
	var createOrderReq models.CreateOrderRequest
	err := json.NewDecoder(r.Body).Decode(&createOrderReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	order, err := h.orderRepo.CreateOrder(&createOrderReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = h.queue.PublishOrderCreated(context.Background(), order)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(order)
	w.WriteHeader(http.StatusCreated)
}
