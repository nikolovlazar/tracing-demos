# Debugging Microservices

This demo showcases how you can use Sentry to instrument and debug your microservices and their communication.

## Running the demo

First, make sure to change the Sentry DSN in the app, order, inventory, kitchen, and delivery service. Search for "dsn:" inside of the directory and you'll see all the places a Sentry DSN is being set.

You'll just need Docker to run this demo. `./boot.sh` will boot up the whole Docker setup, build the images, and run the containers. Open `http://localhost:4000` to access the web app.

## Triggering the operation flow

There's just one operation flow - and that's "Place Order". Just hit the button on the page and head to see your trace in Sentry.

## Gotchas

- The whole operation flow takes a bit more than a minute. If you open the trace immediately after it shows up in Sentry it's not going to be complete. That doesn't mean that the instrumentation is broken, but all the spans haven't arrived yet. Give it a minute and refresh the page in Sentry to see the rest of the spans.
- After booting up the setup (`./boot.sh`), pay attention to the `kong` logs and wait for the `HEALTHLY` messages to start appearing. Either Kong or Consul is slow when it comes to discovering the services' locations. If you try to place an order immediately after booting up the app, you'll get a 500 "failed to fetch" or something like that. Patience.
