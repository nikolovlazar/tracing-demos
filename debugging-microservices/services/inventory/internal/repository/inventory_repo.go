package repository

import (
	"context"
	"fmt"
	"inventory/internal/models"
	"log"
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

type InventoryRepository struct {
	db *sqlx.DB
}

func NewInventoryRepository() (*InventoryRepository, error) {
	dbUrl := os.Getenv("DB_URL")
	if dbUrl == "" {
		dbUrl = "postgres://postgres:password@localhost:5432/inventory?sslmode=disable"
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

	return &InventoryRepository{db: conn}, nil
}

func (r *InventoryRepository) CheckAndReserveInventory(ctx context.Context, orderID int, items []*models.InventoryReservation) (bool, string, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return false, "", err
	}

	defer tx.Rollback()

	for _, item := range items {
		var product models.Product
		query := "SELECT * FROM products WHERE id = $1 FOR UPDATE"
		selectSpan := sentry.StartSpan(ctx, "db.sql.execute", []sentry.SpanOption{
			sentry.WithDescription(query),
		}...)
		selectSpan.SetData("db.system", "postgresql")
		selectSpan.SetData("db.operation", "SELECT")
		selectSpan.SetData("db.name", "products")
		err := tx.GetContext(ctx, &product, query, item.ProductID)
		selectSpan.Finish()
		if err != nil {
			return false, fmt.Sprintf("Product %d not found", item.ProductID), err
		}

		if product.Quantity < item.Quantity {
			return false, fmt.Sprintf("Insufficient quantity for product %d (requested: %d, available: %d)", item.ProductID, item.Quantity, product.Quantity), nil
		}

		// Update product quantity
		query = "UPDATE products SET quantity = quantity - $1, updated_at = $2 WHERE id = $3"
		updateSpan := sentry.StartSpan(ctx, "db.sql.execute", []sentry.SpanOption{
			sentry.WithDescription(query),
		}...)
		updateSpan.SetData("db.system", "postgresql")
		updateSpan.SetData("db.operation", "UPDATE")
		updateSpan.SetData("db.name", "products")
		_, err = tx.ExecContext(ctx, query, item.Quantity, time.Now(), item.ProductID)
		updateSpan.Finish()

		if err != nil {
			return false, "", err
		}

		// Create reservation
		query = "INSERT INTO inventory_reservations (order_id, product_id, quantity, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)"
		insertSpan := sentry.StartSpan(ctx, "db.sql.execute", []sentry.SpanOption{
			sentry.WithDescription(query),
		}...)
		insertSpan.SetData("db.system", "postgresql")
		insertSpan.SetData("db.operation", "INSERT")
		insertSpan.SetData("db.name", "inventory_reservations")
		_, err = tx.ExecContext(ctx, query, orderID, item.ProductID, item.Quantity, "reserved", time.Now())
		insertSpan.Finish()

		if err != nil {
			return false, "", err
		}
	}

	err = tx.Commit()
	if err != nil {
		return false, "", err
	}

	return true, "Successfully reserved inventory", nil
}
