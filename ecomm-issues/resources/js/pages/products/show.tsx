import { ProductDetails } from '@/components/product-details';
import { ProductRecommendations } from '@/components/product-recommendations';
import Layout from '@/layouts';
import { Product } from '@/types';
import { Head } from '@inertiajs/react';

export default function ProductPage({ product, relatedProducts }: { product: Product; relatedProducts: Product[] }) {

    return (
        <Layout>
            <Head title={`${product.name} | ErrorFix`} />
            <div className="container space-y-16 py-10">
                <ProductDetails product={product} />
                {relatedProducts.length > 0 && <ProductRecommendations products={relatedProducts} />}
            </div>
        </Layout>
    );
}
