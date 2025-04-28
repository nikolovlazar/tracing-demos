import { ClientProducts } from '@/components/client-products';
import { Hero } from '@/components/hero';
import Layout from '@/layouts';
import { Product } from '@/types';
import { Head } from '@inertiajs/react';

export default function Welcome({ featuredProducts, allProducts }: { featuredProducts: Product[]; allProducts: Product[] }) {
    return (
        <Layout>
            <Head title="ErrorFix | Goods from Beyond">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
                <meta name="description" content="Because Code Breaks and Someone Has to Fix It" />
            </Head>
            <div className="space-y-16 pb-16">
                <Hero />
                <ClientProducts featuredProducts={featuredProducts} allProducts={allProducts} />
            </div>
        </Layout>
    );
}
