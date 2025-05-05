package main

import (
	"context"
	"log"
	"net/http"
	"order/internal/handlers"
	"order/internal/messaging"
	"order/internal/platform/consul"
	"order/internal/repository"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
)

func main() {
	if err := sentry.Init(sentry.ClientOptions{
		Dsn:              "https://fcb95d209acc4e623750364a39be9645@o4506044970565632.ingest.us.sentry.io/4509197456375808",
		TracesSampleRate: 1.0,
		AttachStacktrace: true,
		EnableTracing:    true,
		TracesSampler: sentry.TracesSampler(func(ctx sentry.SamplingContext) float64 {
			if ctx.Span.Name == "GET /health" {
				return 0.0
			}
			return 1.0
		}),
	}); err != nil {
		log.Fatalf("Sentry initialization failed: %s", err)
	}

	sentryHandler := sentryhttp.New(sentryhttp.Options{
		Repanic: true,
	})

	orderRepo, err := repository.NewOrderRepository()
	if err != nil {
		log.Fatal("❌ Failed to create order repository: ", err)
	}

	rabbitmq, err := messaging.NewRabbitMQClient()
	if err != nil {
		log.Fatal("❌ Failed to create RabbitMQ client: ", err)
	}
	defer rabbitmq.Close()

	handler := handlers.NewOrderHandler(orderRepo, rabbitmq)

	http.HandleFunc("/health", sentryHandler.HandleFunc(handler.HandleHealthCheck))
	http.HandleFunc("/orders", sentryHandler.HandleFunc(handler.HandleOrders))

	go rabbitmq.ConsumeEvents(
		context.Background(),
		handler.HandleInventoryReserved,
		handler.HandleKitchenAccepted,
		handler.HandleOrderCooked,
		handler.HandleDeliveryStarted,
		handler.HandleDeliveryCompleted,
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	go func() {
		time.Sleep(time.Second * 3)
		if err := consul.RegisterService(); err != nil {
			log.Fatal("❌ Failed to register with Consul: ", err)
		}
	}()

	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
