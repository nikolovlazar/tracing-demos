package handlers

import (
	"context"
	"inventory/internal/events"
	"inventory/internal/models"
	"inventory/internal/repository"
	"log"
	"net/http"
)

type InventoryHandler struct {
	repo *repository.InventoryRepository
}

func NewInventoryHandler(repo *repository.InventoryRepository) *InventoryHandler {
	return &InventoryHandler{repo: repo}
}

func (h *InventoryHandler) HandleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (h *InventoryHandler) HandleInventoryCheck(orderId int32, items []*events.OrderItem) (bool, string, error) {
	log.Printf("📦 Processing inventory check for order %d", orderId)

	reservations := make([]*models.InventoryReservation, len(items))
	for i, item := range items {
		reservations[i] = &models.InventoryReservation{
			OrderID:   int(orderId),
			Quantity:  int(item.Quantity),
			ProductID: int(item.Id),
		}
	}

	return h.repo.CheckAndReserveInventory(context.Background(), int(orderId), reservations)
}
