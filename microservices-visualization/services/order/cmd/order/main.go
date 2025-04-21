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
)

func main() {
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

	http.HandleFunc("/health", handler.HandleHealthCheck)
	http.HandleFunc("/orders", handler.HandleOrders)

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
