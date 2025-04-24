package main

import (
	"context"
	"inventory/internal/handlers"
	messaging "inventory/internal/messaging"
	"inventory/internal/platform/consul"
	"inventory/internal/repository"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
)

func main() {
	if err := sentry.Init(sentry.ClientOptions{
		Dsn:              "https://a02b89141ef1a797952e5f3a18e7c0fc@o4506044970565632.ingest.us.sentry.io/4509198465695744",
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

	repo, err := repository.NewInventoryRepository()
	if err != nil {
		log.Fatalf("❌ Failed to create inventory repository: %v", err)
	}

	rabbitmq, err := messaging.NewRabbitMQClient()
	if err != nil {
		log.Fatalf("❌ Failed to create RabbitMQ client: %v", err)
	}
	defer rabbitmq.Close()

	handler := handlers.NewInventoryHandler(repo)

	http.HandleFunc("/health", sentryHandler.HandleFunc(handler.HandleHealthCheck))

	go rabbitmq.ConsumeEvents(
		context.Background(),
		handler.HandleInventoryCheck,
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
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
