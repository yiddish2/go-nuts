import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Nut } from "@/pages/Index";

type Props = {
  nuts: Nut[];
  nutOunces: Record<string, number>;
  totalOunces: number;
  totalPrice: number;
  remaining: number;
  bagSizeOz: number;
  onAddToCart: () => void;
};

export default function BagSummaryPanel({
  nuts,
  nutOunces,
  totalOunces,
  totalPrice,
  remaining,
  bagSizeOz,
  onAddToCart,
}: Props) {
  const progressPercent = Math.min((totalOunces / bagSizeOz) * 100, 100);

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-display text-lg font-bold text-foreground">
          Your 32oz Bag
        </h2>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              {totalOunces} / {bagSizeOz} oz used
            </span>
            <span className={remaining === 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
              {remaining === 0 ? "Bag full!" : `${remaining} oz left`}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${remaining === 0 ? "bg-green-600" : "bg-primary"}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {remaining === 0 && (
            <p className="mt-2 text-xs font-medium text-green-600 animate-fade-in">
              ✓ Your bag is full and ready to go!
            </p>
          )}
        </div>

        {/* Selected nuts summary */}
        {totalOunces > 0 && (
          <div className="mt-5 space-y-2">
            {nuts
              .filter((n) => (nutOunces[n.id] || 0) > 0)
              .map((n) => (
                <div key={n.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {n.name}
                    <span className="ml-1 text-muted-foreground">× {nutOunces[n.id]} oz</span>
                  </span>
                  <span className="font-medium text-foreground">
                    ${(nutOunces[n.id] * n.price_per_ounce).toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Total */}
        <div className="mt-5 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-foreground">Total</span>
            <span className="text-xl font-bold text-primary">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-xs font-medium text-muted-foreground">
          Flat $4.99 shipping on all orders
        </p>
        <button
          onClick={onAddToCart}
          disabled={totalOunces === 0}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
        >
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </button>
      </div>
    </div>
  );
}
