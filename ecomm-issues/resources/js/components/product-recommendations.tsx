import { Card, CardContent } from '@/components/ui/card';
import { Product } from '@/types';
import { Link } from '@inertiajs/react';

interface ProductRecommendationsProps {
    products: Product[];
}

export function ProductRecommendations({ products }: ProductRecommendationsProps) {
    if (products.length === 0) return null;

    return (
        <div>
            <h2 className="mb-6 text-3xl font-bold text-red-500">Related Products</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((product) => (
                    <Link key={product.id} href={`/products/${product.id}`} className="group">
                        <Card className="overflow-hidden border-0 bg-gray-800 transition-all hover:shadow-lg hover:shadow-red-500/20">
                            <div className="aspect-square overflow-hidden rounded-lg bg-gray-700">
                                <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            </div>
                            <CardContent className="px-4 pt-4">
                                <h3 className="text-primary font-medium">{product.name}</h3>
                                <p className="text-muted-foreground mb-2 text-sm">{product.category}</p>
                                <p className="font-medium text-red-500">${product.price.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
