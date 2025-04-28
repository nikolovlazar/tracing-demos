<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization will be handled by middleware
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'totalAmount' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email is required',
            'email.email' => 'Invalid email address',
            'items.required' => 'No items in cart',
            'items.array' => 'Invalid cart format',
            'items.min' => 'Cart cannot be empty',
        ];
    }
}
