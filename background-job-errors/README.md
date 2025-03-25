# Background Job Errors in Solid.js / Go app

This demo showcases how Sentry instruments and measures background job errors.

## Running the demo

You'll need Node.js, Go, and Docker installed. To run the app:

1. `docker compose up -d` to spin up RabbitMQ.
2. `npm install` in the `frontend` project to install the dependencies, and then `npm run dev` to start the frontend server.
3. `go mod download` in the `backend` project to install the dependencies, and then:
   3.1. `go run main.go` to start the main HTTP server.
   3.2. `go run worker/main.go` to start the worker.
4. Visit http://localhost:3000

## Causing a crash in the background jobs

1. Select a report type from the dropdown and hit "Generate Annual Report". This will queue a job in RabbitMQ and the worker will start working on it.
2. All reports pass except the "HR & Personnel" one. Queue up 4-5-6 random reports, and then do an HR one. Watch the worker's console as it goes through the jobs.
