# Slow DB queries in Laravel / Inertia / React app

This demo showcases how Sentry instruments and measures slow database queries.

## Running the demo

You'd need Docker, PHP, Composer, and Node.js installed. To run the app:

1. `docker compose up` to boot up the MySQL database (ensure port 3306 is available)
2. `npm install` to install the frontend dependencies
3. `composer install` to install the backend dependencies
4. `npm run build` to build the frontend
5. Rename the `.example.env` to `.env`
6. Enter your Sentry project DSNs in `.env` at the bottom of the file
7. `php artisan key:generate` to generate the APP_KEY value in the `.env` file
8. `php artisan migrate` to apply the database migrations
9. `php artisan serve` to start the dev server
10. Visit http://localhost:8080

## Causing a slow DB query

1. Once you boot up the app and register, go to the Track page, create a few habits and click on the "Go Crazy! Generate Test Data" button 4-5 times.
2. Visit the Reports page and observe the console for a log of how long the database query took.
3. Click on the generate button to make the query slower to hit your Sentry alert.
