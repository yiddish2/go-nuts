import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BAG_SIZE_OZ = 32;
const MIN_OZ_PER_NUT = 2;
const BAG_BASE_PRICE = 0; // No base price since there's no container selection

type Nut = {
  id: string;
  name: string;
  image: string | null;
  price_per_ounce: number;
  in_stock: boolean;
};

export default function BuildContainer() {
  const { addToCart } = useCart();
  const [nutOunces, setNutOunces] = useState<Record<string, number>>({});
  const [bagQuantity, setBagQuantity] = useState(1);

  const { data: nuts, isLoading } = useQuery({
    queryKey: ["nuts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nuts").select("*").eq("in_stock", true).order("name");
      if (error) throw error;
      return data as Nut[];
    },
  });

  const totalOunces = useMemo(
    () => Object.values(nutOunces).reduce((sum, oz) => sum + oz, 0),
    [nutOunces]
  );

  const remaining = BAG_SIZE_OZ - totalOunces;

  const totalPrice = useMemo(() => {
    if (!nuts) return 0;
    return nuts.reduce((sum, nut) => {
      const oz = nutOunces[nut.id] || 0;
      return sum + oz * nut.price_per_ounce;
    }, 0);
  }, [nutOunces, nuts]);

  const progressPercent = Math.min((totalOunces / BAG_SIZE_OZ) * 100, 100);

  const updateOunces = (nutId: string, delta: number) => {
    setNutOunces((prev) => {
      const current = prev[nutId] || 0;
      const next = current + delta;

      // Enforce minimum: if adding, jump to MIN_OZ_PER_NUT; if removing below MIN, go to 0
      let adjusted = next;
      if (next > 0 && next < MIN_OZ_PER_NUT) {
        adjusted = delta > 0 ? MIN_OZ_PER_NUT : 0;
      }
      adjusted = Math.max(0, adjusted);

      const newTotal = totalOunces - current + adjusted;
      if (newTotal > BAG_SIZE_OZ) return prev;

      if (adjusted === 0) {
        const { [nutId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [nutId]: adjusted };
    });
  };

  const handleAddToCart = () => {
    if (totalOunces === 0) return;
    const selectedNuts = nuts?.filter((n) => (nutOunces[n.id] || 0) > 0) || [];
    const nutNames = selectedNuts
      .map((n) => `${n.name} (${nutOunces[n.id]}oz)`)
      .join(", ");
    const cartImage = selectedNuts[0]?.image || "/placeholder.svg";

    const selectedNutCount = Object.values(nutOunces).filter((oz) => oz > 0).length;
    const mixLabel = selectedNutCount === 1 ? "Full Bag" : "Custom Mix";

    for (let i = 0; i < bagQuantity; i++) {
      addToCart({
        id: `mix-${Date.now()}-${i}`,
        name: `32oz ${mixLabel}`,
        price: Number(totalPrice.toFixed(2)),
        image: cartImage,
        category: "Custom Mix",
        description: nutNames || "",
        weight: `${totalOunces} oz`,
        tags: ["Custom"],
      });
    }
    toast.success(`${bagQuantity} × ${mixLabel} added to cart!`);
    setNutOunces({});
    setBagQuantity(1);
  };

  const handleFillBag = (nutId: string) => {
    setNutOunces({ [nutId]: BAG_SIZE_OZ });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-display text-4xl font-bold text-foreground">
            Build Your 32oz Bag
          </h1>
          <p className="mt-2 text-muted-foreground">
            Fill a whole bag with one nut, or mix it up — minimum {MIN_OZ_PER_NUT}oz per variety.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Left: Nut list */}
            <div className="space-y-3 lg:col-span-2">
              {nuts?.map((nut) => {
                const oz = nutOunces[nut.id] || 0;
                return (
                  <div
                    key={nut.id}
                    className="flex items-center gap-4 rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
                  >
                    <img
                      src={nut.image || "/placeholder.svg"}
                      alt={nut.name}
                      className="h-14 w-14 rounded-md object-cover"
                      loading="lazy"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{nut.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${nut.price_per_ounce.toFixed(2)} / oz
                      </p>
                    </div>

                    {/* Fill whole bag button */}
                    {oz === 0 && remaining >= BAG_SIZE_OZ && (
                      <button
                        onClick={() => handleFillBag(nut.id)}
                        className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        Fill Bag
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateOunces(nut.id, -1)}
                        disabled={oz === 0}
                        className="rounded-full border p-1.5 text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-semibold text-foreground">
                        {oz}
                      </span>
                      <button
                        onClick={() => updateOunces(nut.id, 1)}
                        disabled={remaining <= 0}
                        title={remaining <= 0 ? "Bag is full" : `Add 1 oz (${remaining} oz remaining)`}
                        className="rounded-full border p-1.5 text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {oz > 0 && (
                      <span className="w-16 text-right text-sm font-semibold text-primary">
                        ${(oz * nut.price_per_ounce).toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Summary panel */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="text-display text-lg font-bold text-foreground">
                  Your 32oz Bag
                </h2>

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {totalOunces} / {BAG_SIZE_OZ} oz used
                    </span>
                    <span className={`${remaining === 0 ? "font-semibold text-primary" : "text-muted-foreground"}`}>
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
                      ?.filter((n) => (nutOunces[n.id] || 0) > 0)
                      .map((n) => (
                        <div
                          key={n.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-foreground">
                            {n.name}
                            <span className="ml-1 text-muted-foreground">
                              × {nutOunces[n.id]} oz
                            </span>
                          </span>
                          <span className="font-medium text-foreground">
                            ${(nutOunces[n.id] * n.price_per_ounce).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Bag quantity */}
                {totalOunces > 0 && (
                  <div className="mt-5 flex items-center justify-between border-t pt-4">
                    <span className="font-medium text-foreground">Bags</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBagQuantity((q) => Math.max(1, q - 1))}
                        disabled={bagQuantity <= 1}
                        className="rounded-full border p-1.5 text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center font-semibold text-foreground">
                        {bagQuantity}
                      </span>
                      <button
                        onClick={() => setBagQuantity((q) => q + 1)}
                        className="rounded-full border p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className={`mt-5 border-t pt-4 ${totalOunces === 0 ? "" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">
                      ${(totalPrice * bagQuantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={totalOunces === 0}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                >
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}
