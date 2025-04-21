package repository

import (
	"errors"
	"log"
	"order/internal/models"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

type OrderRepository struct {
	db *sqlx.DB
}

// Make a migration file: migrate create -ext sql -dir migrations -seq [name]

func NewOrderRepository() (*OrderRepository, error) {
	dbUrl := os.Getenv("DB_URL")
	if dbUrl == "" {
		dbUrl = "postgres://postgres:password@localhost:5432/orders?sslmode=disable"
	}
	conn, err := sqlx.Connect("postgres", dbUrl)
	if err != nil {
		return nil, err
	}

	// Run migrations
	log.Println("♻️ Running migrations...")
	driver, err := postgres.WithInstance(conn.DB, &postgres.Config{})
	if err != nil {
		return nil, err
	}

	// Get migrations path from env or use default
	migrationsPath := os.Getenv("MIGRATIONS_PATH")
	if migrationsPath == "" {
		_, b, _, _ := runtime.Caller(0)
		basepath := filepath.Dir(b)
		migrationsPath = filepath.Join(basepath, "../../migrations")
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsPath,
		"postgres", driver)
	if err != nil {
		return nil, err
	}

	err = m.Up()
	if err != nil && err != migrate.ErrNoChange {
		return nil, err
	}

	log.Println("✅ Migrations completed")

	return &OrderRepository{db: conn}, nil
}

func (r *OrderRepository) GetOrder(orderID int32) (*models.Order, error) {
	var order models.Order

	err := r.db.Get(&order, "SELECT * FROM orders WHERE id = $1", orderID)
	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *OrderRepository) UpdateOrderStatus(orderID int32, status string) error {
	_, err := r.db.Exec("UPDATE orders SET status = $1 WHERE id = $2", status, orderID)
	if err != nil {
		return err
	}

	return nil
}

func (r *OrderRepository) CreateOrder(req *models.CreateOrderRequest) (*models.Order, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	order := &models.Order{
		OrderBase: req.OrderBase,
		CreatedAt: time.Now(),
		Items:     req.Items,
	}
	order.OrderBase.Status = "pending"

	query := `
		INSERT INTO orders (customer_id, delivery_address, status, created_at)
		VALUES (:customer_id, :delivery_address, :status, :created_at)
		RETURNING id
	`

	rows, err := tx.NamedQuery(query, order)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, errors.New("no order created")
	}

	err = rows.Scan(&order.Id)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return order, nil
}
