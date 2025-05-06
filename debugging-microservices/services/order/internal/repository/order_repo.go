package repository

import (
	"context"
	"errors"
	"log"
	"order/internal/models"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/getsentry/sentry-go"
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

func (r *OrderRepository) GetOrder(ctx context.Context, orderID int32) (*models.Order, error) {
	parentSpan := sentry.SpanFromContext(ctx)

	var order models.Order

	query := "SELECT * FROM orders WHERE id = $1"

	selectOrderSpan := parentSpan.StartChild("db.sql.execute", []sentry.SpanOption{
		sentry.WithDescription(query),
	}...)
	selectOrderSpan.SetData("db.system", "postgresql")
	selectOrderSpan.SetData("db.operation", "SELECT")
	selectOrderSpan.SetData("db.name", "orders")

	err := r.db.Get(&order, query, orderID)
	selectOrderSpan.Finish()
	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *OrderRepository) UpdateOrderStatus(ctx context.Context, orderID int32, status string) error {
	parentSpan := sentry.SpanFromContext(ctx)

	query := "UPDATE orders SET status = $1 WHERE id = $2"

	insertOrderSpan := parentSpan.StartChild("db.sql.execute", []sentry.SpanOption{
		sentry.WithDescription(query),
	}...)
	insertOrderSpan.SetData("db.system", "postgresql")
	insertOrderSpan.SetData("db.operation", "UPDATE")
	insertOrderSpan.SetData("db.name", "orders")

	_, err := r.db.Exec(query, status, orderID)
	insertOrderSpan.Finish()

	if err != nil {
		return err
	}

	return nil
}

func (r *OrderRepository) CreateOrder(ctx context.Context, req *models.CreateOrderRequest) (*models.Order, error) {
	parentSpan := sentry.SpanFromContext(ctx)

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

	insertOrderSpan := parentSpan.StartChild("db.sql.execute", []sentry.SpanOption{
		sentry.WithDescription(query),
	}...)
	insertOrderSpan.SetData("db.system", "postgresql")
	insertOrderSpan.SetData("db.operation", "INSERT")
	insertOrderSpan.SetData("db.name", "orders")
	defer insertOrderSpan.Finish()

	rows, err := tx.NamedQuery(query, order)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		err = errors.New("no order created")
		sentry.CaptureException(err)
		return nil, err
	}

	err = rows.Scan(&order.Id)
	if err != nil {
		sentry.CaptureException(err)
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		sentry.CaptureException(err)
		return nil, err
	}

	return order, nil
}
