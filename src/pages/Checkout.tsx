import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import { ArrowLeft, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const isSuccess = searchParams.get("success") === "1";
  const isCanceled = searchParams.get("canceled") === "1";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (isSuccess) {
      clearCart();
    }
  }, [isSuccess, clearCart]);

  useEffect(() => {
    if (isCanceled) {
      toast.error("Stripe checkout was canceled.");
    }
  }, [isCanceled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            email,
            customerName: `${firstName} ${lastName}`.trim(),
            origin: window.location.origin,
            items: items.map(({ product, quantity }) => ({
              name: product.name,
              description: product.description || null,
              quantity,
              price: product.price,
            })),
          },
        },
      );

      if (stripeError) throw stripeError;
      if (!stripeData?.url) throw new Error("Stripe session URL missing.");

      window.location.href = stripeData.url as string;
    } catch (err: any) {
      toast.error(err?.message || "Failed to start Stripe checkout. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
          <CheckCircle className="h-16 w-16 text-accent" />
          <h1 className="text-display mt-4 text-3xl font-bold text-foreground">Payment Received!</h1>
          <p className="mt-2 text-muted-foreground">Thank you. Your order is in processing.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
            Continue Shopping
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>

        <h1 className="text-display text-3xl font-bold text-foreground">Checkout</h1>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link to="/" className="mt-4 inline-flex rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
              Go Shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-display text-lg font-semibold text-foreground">Shipping Information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input required placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input required placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2" />
                  <input required placeholder="Address" className="rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2" />
                  <input required placeholder="City" className="rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input required placeholder="ZIP code" inputMode="numeric" onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, ""); }} maxLength={10} className="rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-display text-lg font-semibold text-foreground">Payment</h2>
                <div className="mt-4 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
                  You will be redirected to Stripe's secure checkout page to complete payment.
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-lg font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Secure Checkout — ${totalPrice.toFixed(2)}
              </button>
            </form>

            <div className="h-fit rounded-lg border bg-card p-6">
              <h2 className="text-display text-lg font-semibold text-foreground">Order Summary</h2>
              <div className="mt-4 space-y-3">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <img src={product.image} alt={product.name} className="h-12 w-12 rounded-md object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {quantity} · {product.weight}</p>
                      {product.category === "Custom Mix" && product.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground">${(product.price * quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span><span>Free</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold text-foreground">
                  <span>Total</span><span className="text-primary">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
