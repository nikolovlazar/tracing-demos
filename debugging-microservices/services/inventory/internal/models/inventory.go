package models

import "time"

type Product struct {
	ID        string    `db:"id"`
	Name      string    `db:"name"`
	Quantity  int       `db:"quantity"`
	Price     float64   `db:"price"`
	UpdatedAt time.Time `db:"updated_at"`
}

type InventoryReservation struct {
	ID        int       `db:"id"`
	ProductID int       `db:"product_id"`
	OrderID   int       `db:"order_id"`
	Quantity  int       `db:"quantity"`
	Status    string    `db:"status"` // reserved, released, confirmed
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}
