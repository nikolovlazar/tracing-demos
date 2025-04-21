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
)

func main() {
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

	http.HandleFunc("/health", handler.HandleHealthCheck)

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
