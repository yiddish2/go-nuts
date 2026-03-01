import { X, Minus, Plus, ShoppingCart } from "lucide-react";
import { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

type Props = { product: Product; onClose: () => void };

export default function ProductDetail({ product, onClose }: Props) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addToCart(product);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bark/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 max-h-[90vh] w-full max-w-2xl animate-fade-in overflow-y-auto rounded-xl bg-card p-6 shadow-xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-lg bg-secondary">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{t}</span>
                ))}
              </div>
              <h2 className="text-display mt-3 text-2xl font-bold text-foreground">{product.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{product.weight} · {product.category}</p>
              <p className="mt-4 text-foreground/80">{product.description}</p>
              <p className="mt-4 text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center rounded-full border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-muted-foreground hover:text-foreground">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-medium text-foreground">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleAdd}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105"
              >
                <ShoppingCart className="h-4 w-4" /> Add to Cart — ${(product.price * qty).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
