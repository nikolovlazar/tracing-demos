package consul

import (
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/google/uuid"
	consulapi "github.com/hashicorp/consul/api"
)

func getInternalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1"
	}

	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}

	return "127.0.0.1"
}

func RegisterService() error {
	log.Println("Registering with Consul...")

	consulAddr := os.Getenv("CONSUL_HTTP_ADDR")
	serviceName := os.Getenv("CONSUL_SERVICE_NAME")
	servicePort := os.Getenv("CONSUL_SERVICE_PORT")

	servicePortInt, err := strconv.Atoi(servicePort)
	if err != nil {
		return fmt.Errorf("❌ Failed to convert service port to int: %w", err)
	}

	config := consulapi.DefaultConfig()
	config.Address = consulAddr

	client, err := consulapi.NewClient(config)
	if err != nil {
		return fmt.Errorf("❌ Failed to create Consul client: %w", err)
	}

	internalIP := getInternalIP()

	registration := &consulapi.AgentServiceRegistration{
		ID:      serviceName + "-" + uuid.New().String(),
		Name:    serviceName,
		Port:    servicePortInt,
		Address: internalIP,
		Check: &consulapi.AgentServiceCheck{
			HTTP:                           fmt.Sprintf("http://%s:%d/health", internalIP, servicePortInt),
			Interval:                       "10s",
			Timeout:                        "5s",
			DeregisterCriticalServiceAfter: "30s",
		},
		Tags: []string{"order", "microservice"},
		Meta: map[string]string{
			"version":     "1.0.0",
			"environment": os.Getenv("GO_ENV"),
		},
	}

	if err := client.Agent().ServiceRegister(registration); err != nil {
		return fmt.Errorf("❌ Failed to register with Consul: %w", err)
	}

	// Set up deregistration on process termination
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		if err := client.Agent().ServiceDeregister(registration.ID); err != nil {
			log.Printf("❌ Failed to deregister from Consul: %v", err)
		} else {
			log.Printf("✅ Successfully deregistered from Consul")
		}
		os.Exit(0)
	}()

	log.Printf("✅ Successfully registered with Consul")
	return nil
}
