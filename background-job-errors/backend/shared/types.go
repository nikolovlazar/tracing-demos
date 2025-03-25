package shared

import "time"

// ReportJob represents a job to generate an annual report
type ReportJob struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
	ReportType string    `json:"report_type"`
}

// QueueConfig contains RabbitMQ connection details
type QueueConfig struct {
	URL      string
	QueueName string
}

// DefaultQueueConfig returns the default queue configuration
func DefaultQueueConfig() QueueConfig {
	return QueueConfig{
		URL:       "amqp://admin:admin@localhost:5672/",
		QueueName: "annual_report_jobs",
	}
}