<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->productName(),
            'description' => fake()->realText(200),
            'price' => fake()->randomFloat(2, 9.99, 9999.99),
            'images' => [
                "https://picsum.photos/seed/" . fake()->uuid() . "/400/400",
                "https://picsum.photos/seed/" . fake()->uuid() . "/400/400",
                "https://picsum.photos/seed/" . fake()->uuid() . "/400/400",
            ],
            'category' => fake()->randomElement([
                'Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Automotive', 'Beauty', 'Health', 'Garden', 'Toys',
            ]),
            'sizes' => fake()->randomElements(['S', 'M', 'L', 'XL', 'XXL'], fake()->numberBetween(1, 5)),
            'colors' => fake()->randomElements(['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White'], fake()->numberBetween(1, 5)),
            'featured' => false,
            'in_stock' => true,
            'rating' => fake()->randomFloat(1, 1.5, 4.9),
            'review_count' => fake()->numberBetween(9, 317),
        ];
    }
}
