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
)

func main() {
	rabbitmq, err := messaging.NewRabbitMQClient()
	if err != nil {
		log.Fatal("❌ Failed to create RabbitMQ client: ", err)
	}
	defer rabbitmq.Close()

	handler := handlers.NewKitchenHandler(rabbitmq)

	http.HandleFunc("/health", handler.HandleHealthCheck)

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
