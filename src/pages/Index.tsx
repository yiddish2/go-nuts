import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import NutBuildCard from "@/components/NutBuildCard";
import BagSummaryPanel from "@/components/BagSummaryPanel";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BAG_SIZE_OZ = 32;
const MIN_OZ_PER_NUT = 1;

export type Nut = {
  id: string;
  name: string;
  image: string | null;
  price_per_ounce: number;
  in_stock: boolean;
  nutrition_facts: string | null;
  ingredients: string | null;
};

const Index = () => {
  const { addToCart } = useCart();
  const [search, setSearch] = useState("");
  const [nutOunces, setNutOunces] = useState<Record<string, number>>({});
  

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

  const filtered = useMemo(() => {
    if (!nuts) return [];
    if (!search) return nuts;
    return nuts.filter((n) =>
      n.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, nuts]);

  const updateOunces = (nutId: string, delta: number) => {
    setNutOunces((prev) => {
      const current = prev[nutId] || 0;
      const next = current + delta;

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

  const handleFillBag = (nutId: string) => {
    setNutOunces({ [nutId]: BAG_SIZE_OZ });
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

    addToCart({
      id: `mix-${Date.now()}`,
      name: `32oz ${mixLabel}`,
      price: Number(totalPrice.toFixed(2)),
      image: cartImage,
      category: "Custom Mix",
      description: nutNames || "",
      weight: `${totalOunces} oz`,
      tags: ["Custom"],
    });
    toast.success(`${mixLabel} added to cart!`);
    setNutOunces({});
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroBanner />

      <section id="products" className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-display text-4xl font-bold text-foreground">
            Build Your 32oz Bag
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pick your nuts and dried fruits to fill your bag — minimum {MIN_OZ_PER_NUT}oz per variety.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8 flex justify-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search nuts & dried fruits..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Nut cards grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-2">
              {filtered.map((nut) => (
                <NutBuildCard
                  key={nut.id}
                  nut={nut}
                  ounces={nutOunces[nut.id] || 0}
                  remaining={remaining}
                  bagSizeOz={BAG_SIZE_OZ}
                  onUpdateOunces={(delta) => updateOunces(nut.id, delta)}
                  onFillBag={() => handleFillBag(nut.id)}
                />
              ))}
            </div>

            {/* Summary panel */}
            <BagSummaryPanel
              nuts={nuts || []}
              nutOunces={nutOunces}
              totalOunces={totalOunces}
              totalPrice={totalPrice}
              remaining={remaining}
              bagSizeOz={BAG_SIZE_OZ}
              onAddToCart={handleAddToCart}
            />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">
            No results found. Try a different search.
          </p>
        )}
      </section>

      {/* About */}
      <section id="about" className="border-t bg-secondary/50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-display text-3xl font-bold text-foreground">
            Why NutHaven?
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              { title: "Farm Fresh", desc: "Premium nuts and dried fruits sourced directly from trusted farms with sustainable practices." },
              { title: "Premium Quality", desc: "Every batch is tested for freshness, flavor, and natural goodness." },
              { title: "Fast Delivery", desc: "Carefully packaged and shipped to your door within days." },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6">
                <h3 className="text-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Index;
