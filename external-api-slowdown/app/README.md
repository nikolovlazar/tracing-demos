# External API slowdown in React Native / FastAPI app

This demo showcases how Sentry instruments and measures external API slowdowns.

## Running the demo

You'll need Node.js, Python, and uv installed. To run the app:

1. Add `127.0.0.1 external-api.com` in `/etc/hosts` to proxy the "external API" request
2. `npm install` in the `app` directory to install the React Native app's dependencies
3. `uv sync` in the `api` directory to install the FastAPI backend dependencies
4. `python main.py` and `python stock_analysis_service.py` in the `api` directory to boot up the backend
5. `npm run start` in the `app` directory to start Expo and then hit `i` to run on iOS simulator

## Causing an external API slowdown

1. All "stocks" on the page cause a certain amount of slowdown, with the "Artificial Intelligence" one the most.
2. Tap on any of the stocks and wait for 3-5 seconds to ensure that the Sentry request is sent.
