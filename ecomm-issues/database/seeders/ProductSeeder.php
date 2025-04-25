<?php

namespace Database\Seeders;

use App\Models\Product;
use Database\Factories\Providers\CommerceProvider;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Add our custom provider to Faker
        $faker = fake();
        $faker->addProvider(new CommerceProvider($faker));

        // Track featured products count
        $maxFeatured = 10; // Adjust this number as needed
        $currentCount = 0;

        // Create products in chunks to avoid memory issues
        for ($i = 0; $i < 3000; $i += 100) {
            $products = [];

            for ($j = 0; $j < 100 && ($i + $j) < 3000; $j++) {
                // Determine if this product should be featured
                $shouldBeFeatured = $currentCount < $maxFeatured ?
                    fake()->boolean() : false;

                if ($shouldBeFeatured) {
                    $currentCount++;
                }

                $products[] = [
                    'name' => $faker->productName(),
                    'description' => $faker->realText(200),
                    'price' => fake()->randomFloat(2, 9.99, 9999.99),
                    'images' => json_encode([
                        "https://picsum.photos/seed/" . fake()->uuid() . "/400/400",
                        "https://picsum.photos/seed/" . fake()->uuid() . "/400/400"
                    ]),
                    'category' => fake()->randomElement([
                        'Electronics', 'Clothing', 'Books', 'Home', 'Sports',
                        'Automotive', 'Beauty', 'Health', 'Garden', 'Toys'
                    ]),
                    'sizes' => json_encode(fake()->randomElements([
                        'Extra Small', 'Small', 'Medium', 'Large', 'Extra Large'
                    ], fake()->numberBetween(2, 5))),
                    'colors' => json_encode(fake()->randomElements([
                        'Red', 'Blue', 'Green', 'Yellow', 'Black'
                    ], fake()->numberBetween(2, 5))),
                    'featured' => $shouldBeFeatured,
                    'in_stock' => true,
                    'rating' => fake()->randomFloat(1, 1.5, 4.9),
                    'review_count' => fake()->numberBetween(9, 317),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            // Insert chunk of products
            Product::insert($products);
        }
    }
}
