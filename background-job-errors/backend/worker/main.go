package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/nikolovlazar/tracing-demos/background-job-errors/backend/shared"
	amqp "github.com/rabbitmq/amqp091-go"
)

// Simulating a complex data structure that could cause issues
type employeeData struct {
	records []string
}

func processHRReport(ctx context.Context, data *employeeData) {
	// Use defer to catch any panic
	defer func() {
		if r := recover(); r != nil {
			// Convert the panic to an error
			err, ok := r.(error)
			if !ok {
				err = fmt.Errorf("%v", r)
			}

			// Report the actual crash to Sentry
			sentry.WithScope(func(scope *sentry.Scope) {
				scope.SetLevel(sentry.LevelFatal)
				scope.SetTag("error.type", "panic")
				scope.SetExtra("data", data)
				sentry.CaptureException(err)
			})

			// Re-panic to ensure the worker crashes
			panic(r)
		}
	}()

	// This will cause a nil pointer dereference - a common real-world crash
	// when trying to access data that hasn't been properly initialized
	log.Printf("Processing %d employee records...", len(data.records))
}

func main() {
	// Initialize Sentry
	err := sentry.Init(sentry.ClientOptions{
		Dsn:            "https://1fca7e4659d55182835b0c6983ef4d4a@o4506044970565632.ingest.us.sentry.io/4509039649292288", // Replace with your actual DSN
		EnableTracing:  true,
		TracesSampleRate: 1.0,
		AttachStacktrace: true,
	})
	if err != nil {
		log.Fatalf("sentry.Init: %s", err)
	}
	defer sentry.Flush(2 * time.Second)

	config := shared.DefaultQueueConfig()

	// Connect to RabbitMQ
	conn, err := amqp.Dial(config.URL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open channel: %v", err)
	}
	defer ch.Close()

	// Declare the queue
	q, err := ch.QueueDeclare(
		config.QueueName, // name
		true,            // durable
		false,           // delete when unused
		false,           // exclusive
		false,           // no-wait
		nil,             // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare queue: %v", err)
	}

	// Set prefetch count to 1 to ensure fair dispatch
	err = ch.Qos(
		1,     // prefetch count
		0,     // prefetch size
		false, // global
	)
	if err != nil {
		log.Fatalf("Failed to set QoS: %v", err)
	}

	// Create a channel for graceful shutdown
	done := make(chan bool)

	// Handle graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		log.Println("Shutting down worker...")
		done <- true
	}()

	// Start consuming messages
	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		false,  // auto-ack
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	)
	if err != nil {
		log.Fatalf("Failed to register a consumer: %v", err)
	}

	log.Printf("Worker started, waiting for messages...")

	for {
		select {
		case <-done:
			return
		case msg := <-msgs:
			func() {
				// Extract trace context from message headers
				var traceparent, baggage string
				if tp, ok := msg.Headers["sentry-trace"].(string); ok {
					traceparent = tp
				}
				if bg, ok := msg.Headers["baggage"].(string); ok {
					baggage = bg
				}

				// Start a new transaction with trace continuation
				transaction := sentry.StartTransaction(
					context.Background(),
					"queue.process",
					sentry.WithOpName("queue.task"),
					sentry.ContinueFromHeaders(traceparent, baggage),
					sentry.WithTransactionSource(sentry.SourceTask),
				)
				defer transaction.Finish()

				// Use the transaction's context for all subsequent operations
				ctx := transaction.Context()

				var job shared.ReportJob
				if err := json.Unmarshal(msg.Body, &job); err != nil {
					sentry.WithScope(func(scope *sentry.Scope) {
						scope.SetLevel(sentry.LevelError)
						scope.SetExtra("error", err.Error())
						sentry.CaptureException(err)
					})
					msg.Nack(false, true)
					return
				}

				// Add job details to the transaction
				transaction.SetTag("job.id", job.ID)
				transaction.SetTag("report.type", job.ReportType)

				log.Printf("Received job: %s (Type: %s)", job.ID, job.ReportType)

				// Create a span for the processing work
				span := sentry.StartSpan(ctx, "queue.task")
				span.SetTag("report.type", job.ReportType)
				defer span.Finish()

				time.Sleep(2 * time.Second)

				if job.ReportType == "hr" {
					log.Printf("Loading employee data for HR report...")
					var data *employeeData
					// The nil pointer dereference will be captured by Sentry
					processHRReport(ctx, data)
				}

				msg.Ack(false)
				log.Printf("✅ Completed job: %s", job.ID)
			}()
		}
	}
}