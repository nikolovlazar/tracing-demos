package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"

	"github.com/nikolovlazar/tracing-demos/background-job-errors/backend/publisher"
	"github.com/nikolovlazar/tracing-demos/background-job-errors/backend/shared"
)

type GenerateReportResponse struct {
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	JobID     string    `json:"jobId"`
}

type GenerateReportRequest struct {
	ReportType string `json:"reportType"`
}

func main() {
	// Initialize Sentry
	err := sentry.Init(sentry.ClientOptions{
		Dsn: "https://1fca7e4659d55182835b0c6983ef4d4a@o4506044970565632.ingest.us.sentry.io/4509039649292288",
		EnableTracing: true,
		TracesSampleRate: 1.0,
	})
	if err != nil {
		log.Fatalf("sentry.Init: %s", err)
	}
	defer sentry.Flush(2 * time.Second)

	// Initialize the publisher
	pub, err := publisher.NewPublisher(shared.DefaultQueueConfig())
	if err != nil {
		log.Fatalf("Failed to create publisher: %v", err)
	}
	defer pub.Close()

	// Enable CORS for development
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, sentry-trace, baggage")
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	// Create a new mux router
	mux := http.NewServeMux()

	// Define the generate report endpoint
	mux.HandleFunc("/api/generate-report", func(w http.ResponseWriter, r *http.Request) {
		// Create transaction options with trace continuation
		options := []sentry.SpanOption{
			sentry.WithOpName("http.server"),
			sentry.ContinueFromRequest(r),
			sentry.WithTransactionSource(sentry.SourceURL),
		}

		// Start a new transaction with trace continuation
		transaction := sentry.StartTransaction(
			r.Context(),
			fmt.Sprintf("%s %s", r.Method, r.URL.Path),
			options...,
		)
		defer transaction.Finish()

		// Add the transaction to the request context
		r = r.WithContext(transaction.Context())

		if r.Method != http.MethodPost {
			sentry.WithScope(func(scope *sentry.Scope) {
				scope.SetLevel(sentry.LevelError)
				scope.SetExtra("method", r.Method)
				sentry.CaptureMessage("Method not allowed")
			})
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req GenerateReportRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sentry.WithScope(func(scope *sentry.Scope) {
				scope.SetLevel(sentry.LevelError)
				scope.SetExtra("error", err.Error())
				sentry.CaptureException(err)
			})
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		jobID := time.Now().Format("20060102150405")

		// Create a child span for publishing
		span := sentry.StartSpan(r.Context(), "publish_job")
		span.SetTag("job.id", jobID)
		span.SetTag("report.type", req.ReportType)

		if err := pub.PublishJob(span.Context(), jobID, req.ReportType); err != nil {
			span.SetTag("error", "true")
			sentry.CaptureException(err)
			span.Finish()
			http.Error(w, "Failed to generate report", http.StatusInternalServerError)
			return
		}
		span.Finish()

		response := GenerateReportResponse{
			Message:   "Annual report generation started",
			Timestamp: time.Now(),
			JobID:     jobID,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// Wrap the mux with CORS middleware
	handler := corsMiddleware(mux)

	// Start the server
	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatal(err)
	}
}