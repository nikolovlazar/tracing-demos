package main

import (
	"context"
	"kitchen/internal/handlers"
	"kitchen/internal/messaging"
	"kitchen/internal/platform/consul"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
)

func main() {
	if err := sentry.Init(sentry.ClientOptions{
		Dsn:              "https://7f46d381d6e1765289f6e99bdb8644e3@o4506044970565632.ingest.us.sentry.io/4509198161346560",
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

	handler := handlers.NewKitchenHandler(rabbitmq)

	http.HandleFunc("/health", sentryHandler.HandleFunc(handler.HandleHealthCheck))

	go rabbitmq.ConsumeEvents(
		context.Background(),
		handler.HandleReadyForKitchen,
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
