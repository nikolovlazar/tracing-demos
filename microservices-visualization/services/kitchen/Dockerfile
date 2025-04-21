# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o kitchen cmd/kitchen/main.go

# Final stage
FROM alpine:3.19

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/kitchen .

# Add timezone data
RUN apk --no-cache add tzdata

ARG PORT
ENV PORT=${PORT}

EXPOSE ${PORT}

CMD ["./kitchen"]
