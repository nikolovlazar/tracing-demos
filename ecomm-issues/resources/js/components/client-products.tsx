import { Product } from '@/types';
import { FeaturedCollection } from './featured-collection';
import { ProductGrid } from './product-grid';
// import * as Sentry from '@sentry/nextjs';
export function ClientProducts({ products }: { products: Product[] }) {
    return (
        <>
            <FeaturedCollection title="Featured Products" description="Unique artifacts from across the dimensions." products={products} />
            <div className="container">
                <h2 className="mb-8 text-4xl font-bold tracking-tight text-red-500">All Products</h2>
                {products.length > 0 ? <ProductGrid products={products} /> : <p className="py-10 text-center text-gray-500">No products found</p>}
            </div>
        </>
    );
}
