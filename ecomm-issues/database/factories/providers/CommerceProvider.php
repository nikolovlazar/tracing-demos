<?php

namespace Database\Factories\Providers;

use Faker\Provider\Base;

class CommerceProvider extends Base {
    protected static $productNames = [
        'Ergonomic %s Shirt',
        'Sleek %s Pants',
        'Awesome %s Hat',
        'Incredible %s Gloves',
        'Practical %s Shoes',
    ];

    protected static $materials = [
        'Steel', 'Wooden', 'Concrete', 'Cotton', 'Granite', 'Rubber',
        'Metal', 'Soft', 'Fresh', 'Frozen',
    ];

    public function productName(): string
    {
        $pattern = static::randomElement(static::$productNames);
        $material = static::randomElement(static::$materials);
        return sprintf($pattern, $material);
    }
}