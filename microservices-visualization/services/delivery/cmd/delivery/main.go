package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"delivery/internal/handlers"
	"delivery/internal/messaging"
	"delivery/internal/platform/consul"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
)

func main() {
	if err := sentry.Init(sentry.ClientOptions{
		Dsn:              "https://b4ddadd3686eb05f7ba1c2f76a7a7351@o4506044970565632.ingest.us.sentry.io/4509198467989504",
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

	rabbitmq, err := messaging.NewRabbitMQClient()
	if err != nil {
		log.Fatal("❌ Failed to create RabbitMQ client: ", err)
	}
	defer rabbitmq.Close()

	handler := handlers.NewDeliveryHandler(rabbitmq)

	http.HandleFunc("/health", sentryHandler.HandleFunc(handler.HandleHealthCheck))

	go rabbitmq.ConsumeEvents(
		context.Background(),
		handler.HandleReadyForDelivery,
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
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
