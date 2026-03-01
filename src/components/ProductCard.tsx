import { Plus } from "lucide-react";
import { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";

type Props = { product: Product; onSelect: (p: Product) => void };

export default function ProductCard({ product, onSelect }: Props) {
  const { addToCart } = useCart();

  return (
    <div className="group animate-fade-in cursor-pointer overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-secondary" onClick={() => onSelect(product)}>
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute right-2 top-2 flex flex-wrap gap-1">
          {product.tags.map((t) => (
            <span key={t} className="rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-display font-semibold text-foreground" onClick={() => onSelect(product)}>
          {product.name}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{product.weight}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-105"
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
