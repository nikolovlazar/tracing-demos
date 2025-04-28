# Ecommerce Issues in Laravel / React app

This demo showcases how Sentry instruments and helps you debug e-commerce app issues.

## ⚙️ Setting up the project

You'll need PHP, Composer, and Node.js installed. To run the app:

```bash
composer install                 # to install PHP dependencies
npm install                      # to instal Node dependencies
npm run build                    # to build frontend assets
touch database/database.sqlite   # to create the local database file
php artisan migrate:fresh        # to apply migrations to the database
php artisan db:seed              # to seed the database with demo data
cp .env.example .env             # to setup env variables
php artisan key:generate         # to generate an application key
composer dev:ssr                 # to start the project in SSR mode
```

Then visit http://localhost:8000.

## ✋ Before we begin

Make sure to register for an account at [Sentry](https://sentry.io/signup?utm_source=workshop&utm_medium=github&utm_campaign=lazar-tracing). Create a Laravel and a React project, and have the DSNs by hand. We'll start the workshop by installing and configuring Sentry's SDKs for Laravel and React.

## 1️⃣ First issue

Homepage returns 3000 products, and that causes bad Web Vitals and sluggish usage. We'll implement Sentry + add the tracing headers in `app.blade.php` file to enable distributed tracing + manually create a span to send the number of returned products. The trace will show the number of products being 3000 plus a whole bunch of resource spans that aren't even lazy loaded. That's a 🚨.

## 2️⃣ Second issue

Sizes on the Product Details page are hardcoded. Products don't have all the sizes, and none of them have the "Extra Small" size. Adding a product with "Extra Small" size to the cart will throw an error. At this point Sentry's SDK has already been configured, so it'll capture the exception and we'll have a ton of debugging info to look at in Sentry.

## 3️⃣ Third issue

The third issue happens when we try to check out with the `admin@admin.com` account. That account is not permitted to make purchases, but the catch lies that the exception is being handled on the backend, but not reported to Sentry. The frontend exception is cryptic and doesn't tell much, so we'll use Breadcrumbs and Session Replay to figure out what exactly happened, locate where the backend exception is happening, and report it to Sentry.
