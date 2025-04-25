import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/cart-context';
import { Product } from '@/types';
import { motion } from 'framer-motion';
import { Heart, Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';

interface ProductDetailsProps {
    product: Product;
}

export function ProductDetails({ product }: ProductDetailsProps) {
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
    const [selectedColor, setSelectedColor] = useState(product.colors[0]);
    const [quantity, setQuantity] = useState(1);
    const { addItem } = useCart();

    const handleAddToCart = () => {
        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            quantity,
            selectedSize,
            selectedColor,
        });
    };

    return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <motion.div className="space-y-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-800">
                    <img src={product.images[selectedImage]} alt={product.name} width={800} height={800} className="h-full w-full object-cover" />
                </div>
                <div className="flex space-x-2">
                    {product.images.map((image, index) => (
                        <button
                            key={index}
                            className={`relative aspect-square w-20 overflow-hidden rounded-md bg-gray-800 ${
                                selectedImage === index ? 'ring-2 ring-red-500' : ''
                            }`}
                            onClick={() => setSelectedImage(index)}
                        >
                            <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            </motion.div>

            <motion.div className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <div>
                    <h1 className="text-primary text-4xl font-bold">{product.name}</h1>
                    <div className="mt-2 flex items-center">
                        <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                        i < Math.floor(product.rating) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                                    }`}
                                />
                            ))}
                        </div>
                        <span className="text-muted-foreground ml-2 text-sm">
                            {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                        </span>
                    </div>
                    <p className="mt-4 text-2xl font-bold text-red-500">${product.price.toFixed(2)}</p>
                </div>

                <Separator className="bg-gray-800" />

                <div className="space-y-4">
                    <div>
                        <h3 className="mb-2 font-medium">Size</h3>
                        <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="flex flex-wrap gap-2">
                            {product.sizes.map((size) => (
                                <div key={size} className="flex items-center">
                                    <RadioGroupItem value={size} id={`size-${size}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`size-${size}`}
                                        className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-gray-700 bg-gray-800 px-3 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-500/10 peer-data-[state=checked]:text-red-500"
                                    >
                                        {size}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div>
                        <h3 className="mb-2 font-medium">Color</h3>
                        <RadioGroup value={selectedColor} onValueChange={setSelectedColor} className="flex flex-wrap gap-2">
                            {product.colors.map((color) => (
                                <div key={color} className="flex items-center">
                                    <RadioGroupItem value={color} id={`color-${color}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`color-${color}`}
                                        className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-gray-700 bg-gray-800 px-3 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-500/10 peer-data-[state=checked]:text-red-500"
                                    >
                                        {color}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div>
                        <h3 className="mb-2 font-medium">License Quantity</h3>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="border-gray-700 bg-gray-800 hover:bg-gray-700"
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{quantity}</span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setQuantity(quantity + 1)}
                                className="border-gray-700 bg-gray-800 hover:bg-gray-700"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" size="lg" onClick={handleAddToCart}>
                        <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
                    </Button>
                    <Button variant="outline" size="lg" className="border-red-600 text-red-500 hover:bg-red-600/10">
                        <Heart className="mr-2 h-5 w-5" /> Save
                    </Button>
                </div>

                <Separator className="bg-gray-800" />

                <div>
                    <h3 className="mb-2 font-medium">Description</h3>
                    <p className="text-muted-foreground">{product.description}</p>
                </div>
            </motion.div>
        </div>
    );
}
