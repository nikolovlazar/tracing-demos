<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $parent = \Sentry\SentrySDK::getCurrentHub()->getSpan();
        $span = null;

        if ($parent !== null) {
            $context = \Sentry\Tracing\SpanContext::make()
                ->setOp('function')
                ->setDescription('Fetch products');
            $span = $parent->startChild($context);

            \Sentry\SentrySDK::getCurrentHub()->setSpan($span);
        }

        $featuredProducts = Product::select()->where('featured', 1)->get();
        $allProducts = Product::all();

        $span?->setData([ 'numFeaturedProducts' => count($featuredProducts), 'numAllProducts' => count($allProducts) ]);
        $span?->finish();

        return Inertia::render('index', [ 'featuredProducts' => $featuredProducts, 'allProducts' => $allProducts ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        $relatedProducts = Product::where('category', $product->category)->where('id', '!=', $product->id)->get()->take(4);
        return Inertia::render('products/show', [ 'product' => $product, 'relatedProducts' => $relatedProducts ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        //
    }
}
