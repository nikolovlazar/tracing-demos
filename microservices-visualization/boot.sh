#!/usr/bin/env bash

set -e

# Phase 1: Start Consul and dependencies
echo "🧪 Starting Consul and dependencies..."
docker compose up -d consul

# Wait for Consul to be healthy
echo "⏳ Waiting for Consul to be ready..."
until curl --silent --fail http://localhost:8500/v1/status/leader > /dev/null; do
  sleep 1
done
echo "✅ Consul is healthy."

# Get Consul IP address
CONSUL_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' consul)
echo "🔌 Found Consul IP: $CONSUL_IP"

# Inject IP into .env for docker-compose interpolation
echo "CONSUL_IP=$CONSUL_IP" > .env

# Phase 2: Start Kong and other services
echo "🚀 Starting Kong and remaining services..."
docker compose up -d