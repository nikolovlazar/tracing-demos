<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function index()
    {
        return Inertia::render('checkout');
    }

    public function store(PurchaseRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            // Simulate processing delay
            if (app()->environment('local', 'development')) {
                sleep(1.5);
            }

            if ($validated['email'] === 'admin@admin.com') {
                throw new \Exception("Purchasing with the admin email is not allowed.");
            }

            $transactionId = Str::random(13);

            return response()->json([
                'success' => true,
                'transactionId' => $transactionId,
                'timestamp' => now()->toISOString(),
                'amount' => $validated['totalAmount'],
                'itemCount' => count($validated['items']),
            ]);

        } catch (\Exception $e) {
            report($e);

            return response()->json([
                'error' => 'Payment processing failed',
                'message' => $e->getMessage(),
                'details' => app()->environment('development') ? $e->getMessage() : null,
                'code' => 'PAYMENT_ERROR',
            ], 500);
        }
    }
}
