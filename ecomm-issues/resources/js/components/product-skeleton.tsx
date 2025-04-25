export function ProductGridSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
            ))}
        </div>
    );
}

export function FeaturedProductsSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
            ))}
        </div>
    );
}

function ProductCardSkeleton() {
    return (
        <div className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="aspect-square w-full bg-gray-200" />
            <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-1/4 rounded bg-gray-200" />
            </div>
        </div>
    );
}
