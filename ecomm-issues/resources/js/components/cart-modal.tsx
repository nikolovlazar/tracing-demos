import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCart } from '@/context/cart-context';
import { Link } from '@inertiajs/react';
import { ArrowRight, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useEffect } from 'react';

interface CartModalProps {
    open: boolean;
    onClose: () => void;
}

export function CartModal({ open, onClose }: CartModalProps) {
    const { items, removeItem, updateQuantity, totalPrice } = useCart();

    // Close the modal when pressing escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center">
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        Your Cart ({items.length})
                    </SheetTitle>
                </SheetHeader>

                {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-12">
                        <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                            <ShoppingBag className="text-muted-foreground h-8 w-8" />
                        </div>
                        <p className="text-muted-foreground mb-6">Your cart is empty</p>
                        <Button onClick={onClose}>Continue Shopping</Button>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 py-4">
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex gap-4">
                                        <div className="bg-muted h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
                                            <img src={item.image} alt={item.name} width={80} height={80} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="truncate text-sm font-medium">{item.name}</h4>
                                            <p className="text-muted-foreground text-sm">
                                                {item.selectedSize} / {item.selectedColor}
                                            </p>
                                            <div className="mt-2 flex items-center">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedColor, item.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center text-sm">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedColor, item.quantity + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="mt-auto h-6 w-6"
                                                onClick={() => removeItem(item.id, item.selectedSize, item.selectedColor)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="border-t pt-4">
                            <div className="mb-4 space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>${totalPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Parallel Import Duty</span>
                                    <span>Free</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-medium">
                                    <span>Total</span>
                                    <span>${totalPrice.toFixed(2)}</span>
                                </div>
                            </div>

                            <SheetFooter className="flex flex-col gap-2 sm:flex-col">
                                <Button asChild size="lg" className="w-full bg-red-600 text-white hover:bg-red-700">
                                    <Link href="/checkout" onClick={onClose}>
                                        Checkout <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button variant="outline" onClick={onClose} size="lg">
                                    Continue Shopping
                                </Button>
                            </SheetFooter>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
