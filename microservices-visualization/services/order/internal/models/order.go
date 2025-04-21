package models

import (
	"time"
)

type OrderBase struct {
	CustomerID      string `db:"customer_id"`
	DeliveryAddress string `db:"delivery_address"`
	Status          string `db:"status"`
}

type Order struct {
	Id int `db:"id,primary_key,autoincrement"`
	OrderBase
	CreatedAt time.Time   `db:"created_at"`
	Items     []OrderItem `db:"items"`
}

type CreateOrderRequest struct {
	OrderBase
	Items []OrderItem `db:"items"`
}

type OrderItem struct {
	Id       int     `db:"id"`
	Name     string  `db:"name"`
	Quantity int     `db:"quantity"`
	Price    float64 `db:"price"`
}
