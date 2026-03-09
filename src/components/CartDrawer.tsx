import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { SHIPPING_FEE } from "@/lib/pricing";

export default function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalPrice } = useCart();
  const navigate = useNavigate();
  const placeholderSrc = "/placeholder.svg?v=1";
  const orderTotal = totalPrice + SHIPPING_FEE;

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setIsCartOpen(false)}>
      <div className="absolute inset-0 bg-bark/40 backdrop-blur-sm" />
      <div
        className="relative h-full w-full max-w-md animate-slide-in-right bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-display text-lg font-bold text-foreground">Your Cart</h2>
            <button onClick={() => setIsCartOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex gap-3 rounded-lg border p-3">
                      <img
                        src={product.image || placeholderSrc}
                        alt={product.name}
                        className="h-16 w-16 rounded-md bg-secondary object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes("/placeholder.svg")) {
                            target.src = placeholderSrc;
                          }
                        }}
                      />
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium text-foreground">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.weight}</p>
                            {product.category === "Custom Mix" && product.description && (
                              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {product.description}
                              </p>
                            )}
                          </div>
                          <button onClick={() => removeFromCart(product.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center rounded-full border">
                            <button onClick={() => updateQuantity(product.id, quantity - 1)} className="px-2 py-1 text-muted-foreground"><Minus className="h-3 w-3" /></button>
                            <span className="w-6 text-center text-sm font-medium text-foreground">{quantity}</span>
                            <button onClick={() => updateQuantity(product.id, quantity + 1)} className="px-2 py-1 text-muted-foreground"><Plus className="h-3 w-3" /></button>
                          </div>
                          <span className="font-semibold text-primary">${(product.price * quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t p-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>${SHIPPING_FEE.toFixed(2)}</span>
                </div>
                <div className="mb-4 mt-2 flex justify-between border-t pt-2 text-lg font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-primary">${orderTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => { setIsCartOpen(false); navigate("/checkout"); }}
                  className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
