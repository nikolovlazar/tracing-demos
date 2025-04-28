<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description');
            $table->decimal('price', 8, 2);
            $table->string('category');
            $table->boolean('featured')->default(false);
            $table->integer('inventory')->default(0);
            $table->decimal('rating', 3, 1)->nullable();
            $table->integer('review_count')->default(0);
            $table->json('images')->default('[]');
            $table->json('sizes')->default('[]');
            $table->json('colors')->default('[]');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
