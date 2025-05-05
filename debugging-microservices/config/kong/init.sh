#!/bin/bash

# Wait for Consul to be ready
until curl -s http://consul:8500/v1/status/leader >/dev/null; do
  echo "Waiting for Consul to be ready..."
  sleep 2
done

# Get Consul's IP address
CONSUL_IP=$(getent hosts consul | awk '{ print $1 }')

# Update Kong's DNS resolver configuration
echo "Setting Kong's DNS resolver to Consul at $CONSUL_IP:8600"
export KONG_DNS_RESOLVER="$CONSUL_IP:8600"

# Start Kong
exec /docker-entrypoint.sh kong docker-start