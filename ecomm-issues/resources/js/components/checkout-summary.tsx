import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/cart-context';

export function CheckoutSummary() {
    const { items, totalPrice } = useCart();

    return (
        <Card className="border-gray-800 bg-gray-900">
            <CardContent className="pt-6">
                <h2 className="mb-4 text-2xl font-semibold text-red-500">Order Summary</h2>

                <div className="mb-6 space-y-4">
                    {items.map((item) => (
                        <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex gap-3">
                            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-800">
                                <img src={item.image} alt={item.name} className="object-cover" />
                                <div className="text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs">
                                    {item.quantity}
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="line-clamp-2 text-sm font-medium">{item.name}</h4>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {item.selectedSize} / {item.selectedColor}
                                </p>
                                <p className="mt-1 text-sm font-medium text-red-500">${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <Separator className="mb-4 bg-gray-800" />

                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Error Insurance</span>
                        <span>Free</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Bug Tax</span>
                        <span>$0.00</span>
                    </div>
                    <Separator className="my-4 bg-gray-800" />
                    <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span className="text-red-500">${totalPrice.toFixed(2)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
