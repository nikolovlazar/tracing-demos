<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model {
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'description',
        'price',
        'category',
        'featured',
        'in_stock',
        'rating',
        'review_count',
        'images',
        'sizes',
        'colors',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'price' => 'float',
        'featured' => 'boolean',
        'in_stock' => 'boolean',
        'rating' => 'float',
        'review_count' => 'integer',
        'images' => 'array',
        'sizes' => 'array',
        'colors' => 'array',
    ];

    /**
     * The model's default values for attributes.
     *
     * @var array
     */
    protected $attributes = [
        'featured' => false,
        'in_stock' => true,
        'review_count' => 0,
        'images' => '[]',
        'sizes' => '[]',
        'colors' => '[]',
    ];
}