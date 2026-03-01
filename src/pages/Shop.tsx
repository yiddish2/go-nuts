import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import { Plus, ShoppingCart, Loader2 } from "lucide-react";

const FIXED_WEIGHTS = [4, 8, 12, 16]; // oz options

type Nut = {
  id: string;
  name: string;
  image: string | null;
  price_per_ounce: number;
  in_stock: boolean;
};

export default function Shop() {
  const { addToCart } = useCart();

  const { data: nuts, isLoading } = useQuery({
    queryKey: ["nuts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nuts")
        .select("*")
        .eq("in_stock", true)
        .order("name");
      if (error) throw error;
      return data as Nut[];
    },
  });

  const handleAddToCart = (nut: Nut, ounces: number) => {
    const price = Number((nut.price_per_ounce * ounces).toFixed(2));
    addToCart({
      id: `${nut.id}-${ounces}oz`,
      name: `${nut.name}`,
      price,
      image: nut.image || "/placeholder.svg",
      category: "Nuts",
      description: `${ounces} oz bag`,
      weight: `${ounces} oz`,
      tags: [],
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-display text-4xl font-bold text-foreground">
            Shop Nuts
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pick your favorite nuts and choose your bag size.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !nuts || nuts.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No nuts available right now. Check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {nuts.map((nut) => (
              <NutCard key={nut.id} nut={nut} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}

function NutCard({
  nut,
  onAddToCart,
}: {
  nut: Nut;
  onAddToCart: (nut: Nut, oz: number) => void;
}) {
  const [selectedOz, setSelectedOz] = useState(8);

  return (
    <div className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={nut.image || "/placeholder.svg"}
          alt={nut.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="text-display text-lg font-semibold text-foreground">
          {nut.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          ${nut.price_per_ounce.toFixed(2)} / oz
        </p>

        {/* Weight selector */}
        <div className="mt-3 flex flex-wrap gap-2">
          {FIXED_WEIGHTS.map((oz) => (
            <button
              key={oz}
              onClick={() => setSelectedOz(oz)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedOz === oz
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {oz} oz
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            ${(nut.price_per_ounce * selectedOz).toFixed(2)}
          </span>
          <button
            onClick={() => onAddToCart(nut, selectedOz)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-105"
            aria-label={`Add ${nut.name} to cart`}
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
