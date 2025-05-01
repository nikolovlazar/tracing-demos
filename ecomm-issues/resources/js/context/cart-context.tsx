import { CartItem, Product } from '@/types';
import * as Sentry from '@sentry/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CartContextType {
    items: CartItem[];
    addItem: (product: Product, selectedSize: string, selectedColor: string, quantity: number) => CartItem;
    removeItem: (id: string, size: string, color: string) => void;
    updateQuantity: (id: string, size: string, color: string, quantity: number) => void;
    clearCart: () => void;
    itemCount: number;
    totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const initialized = useRef(false);
    const isClient = useRef(false);

    // Check if we're in the browser
    useEffect(() => {
        isClient.current = true;
    }, []);

    // Load cart from localStorage on mount
    useEffect(() => {
        if (isClient.current && !initialized.current) {
            const storedCart = localStorage.getItem('cart');
            if (storedCart) {
                try {
                    setItems(JSON.parse(storedCart));
                } catch (error) {
                    console.error('Failed to parse cart from localStorage', error);
                }
            }
            initialized.current = true;
        }
    }, []);

    // Save cart to localStorage when it changes
    useEffect(() => {
        if (isClient.current && initialized.current) {
            localStorage.setItem('cart', JSON.stringify(items));
        }
    }, [items]);

    const addItem = (product: Product, selectedSize: string, selectedColor: string, quantity: number) => {
        // Validate that the selected size and color are available for this product
        if (!product.sizes.includes(selectedSize)) {
            Sentry.setContext('Sizes', {
                productId: product.id,
                productSizes: product.sizes,
                selectedSize,
            });
            throw new Error('The selected size is not available for this product');
        }
        if (!product.colors.includes(selectedColor)) {
            Sentry.setContext('Colors', {
                productId: product.id,
                productColors: product.colors,
                selectedColor,
            });
            throw new Error('The selected color is not available for this product');
        }

        const newItem: CartItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            quantity,
            selectedSize,
            selectedColor,
        };

        setItems((prevItems) => {
            // Check if item already exists with same id, size and color
            const existingItemIndex = prevItems.findIndex(
                (item) => item.id === newItem.id && item.selectedSize === newItem.selectedSize && item.selectedColor === newItem.selectedColor,
            );

            if (existingItemIndex > -1) {
                // Update quantity of existing item
                const updatedItems = JSON.parse(JSON.stringify(prevItems));
                updatedItems[existingItemIndex].quantity += newItem.quantity;

                return updatedItems;
            } else {
                return [...prevItems, newItem];
            }
        });

        return newItem;
    };

    const removeItem = (id: string, size: string, color: string) => {
        setItems((prevItems) => {
            const itemToRemove = prevItems.find((item) => item.id === id && item.selectedSize === size && item.selectedColor === color);

            if (itemToRemove && isClient.current) {
                setTimeout(() => {
                    toast('Removed from cart', {
                        description: `${itemToRemove.name} removed from your cart.`,
                    });
                }, 0);
            }

            return prevItems.filter((item) => !(item.id === id && item.selectedSize === size && item.selectedColor === color));
        });
    };

    const updateQuantity = (id: string, size: string, color: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(id, size, color);
            return;
        }

        setItems((prevItems) =>
            prevItems.map((item) => (item.id === id && item.selectedSize === size && item.selectedColor === color ? { ...item, quantity } : item)),
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    const totalPrice = items.reduce((total, item) => total + item.price * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                itemCount,
                totalPrice,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
