<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\HabitController;
use App\Http\Controllers\ReportController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('track', [HabitController::class, 'index'])->name('track');
    Route::post('habits', [HabitController::class, 'store'])->name('habits.store');
    Route::put('habits/{habit}', [HabitController::class, 'update'])->name('habits.update');
    Route::delete('habits/{habit}', [HabitController::class, 'destroy'])->name('habits.destroy');
    Route::post('habits/{habit}/complete', [HabitController::class, 'complete'])->name('habits.complete');
    Route::post('habits/bulk-complete', [HabitController::class, 'bulkComplete'])->name('habits.bulk-complete');
    Route::get('reports', [ReportController::class, 'index'])->name('reports');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
