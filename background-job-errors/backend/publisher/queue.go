package publisher

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/nikolovlazar/tracing-demos/background-job-errors/backend/shared"
	amqp "github.com/rabbitmq/amqp091-go"
)

type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	config  shared.QueueConfig
}

func NewPublisher(config shared.QueueConfig) (*Publisher, error) {
	conn, err := amqp.Dial(config.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	// Declare the queue
	_, err = ch.QueueDeclare(
		config.QueueName, // name
		true,             // durable
		false,            // delete when unused
		false,            // exclusive
		false,            // no-wait
		nil,              // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare queue: %w", err)
	}

	return &Publisher{
		conn:    conn,
		channel: ch,
		config:  config,
	}, nil
}

func (p *Publisher) Close() {
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		p.conn.Close()
	}
}

func (p *Publisher) PublishJob(ctx context.Context, jobID string, reportType string) error {
	span := sentry.StartSpan(ctx, "queue.publish")
	span.SetTag("queue.name", p.config.QueueName)
	span.SetTag("messaging.system", "rabbitmq")
	defer span.Finish()

	job := shared.ReportJob{
		ID:         jobID,
		CreatedAt:  time.Now(),
		Status:     "pending",
		ReportType: reportType,
	}

	body, err := json.Marshal(job)
	if err != nil {
		span.SetTag("error", "true")
		sentry.CaptureException(err)
		return fmt.Errorf("failed to marshal job: %w", err)
	}

	// Get trace headers from the current span
	traceparent := sentry.TransactionFromContext(ctx).ToSentryTrace()
	baggage := sentry.TransactionFromContext(ctx).ToBaggage()

	err = p.channel.PublishWithContext(ctx,
		"",                 // exchange
		p.config.QueueName, // routing key
		false,              // mandatory
		false,              // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
			Headers: amqp.Table{
				sentry.SentryTraceHeader:   traceparent,
				sentry.SentryBaggageHeader: baggage,
			},
		})
	if err != nil {
		span.SetTag("error", "true")
		sentry.CaptureException(err)
		return fmt.Errorf("failed to publish job: %w", err)
	}

	return nil
}
