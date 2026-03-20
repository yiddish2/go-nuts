import { Minus, Plus } from "lucide-react";
import { Nut } from "@/pages/Index";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import NutritionLabel, { parseNutrition } from "@/components/NutritionLabel";

type Props = {
  nut: Nut;
  ounces: number;
  remaining: number;
  bagSizeOz: number;
  onUpdateOunces: (delta: number) => void;
  onFillBag: () => void;
};

export default function NutBuildCard({
  nut,
  ounces,
  remaining,
  bagSizeOz,
  onUpdateOunces,
  onFillBag,
}: Props) {
  const isActive = ounces > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={`group flex h-full animate-fade-in flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg cursor-pointer ${
            isActive ? "ring-2 ring-primary/40" : ""
          }`}
        >
          <div className="relative aspect-square overflow-hidden bg-secondary">
            <img
              src={nut.image || "/placeholder.svg"}
              alt={nut.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {ounces === 0 && remaining >= bagSizeOz && (
              <button
                onClick={(e) => { e.stopPropagation(); onFillBag(); }}
                className="absolute right-2 top-2 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm transition-colors hover:bg-card"
              >
                Fill Bag
              </button>
            )}
          </div>
          <div className="flex flex-1 flex-col p-3">
            <h3 className="min-h-[2.5rem] text-display text-sm font-semibold text-foreground">
              {nut.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ${nut.price_per_ounce.toFixed(2)} / oz
            </p>

            <div className="mt-auto pt-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              {isActive ? (
                <div className="flex w-full items-center gap-1">
                  <button
                    onClick={() => onUpdateOunces(-1)}
                    className="flex flex-1 items-center justify-center rounded-l-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-105"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex items-center justify-center bg-primary/90 px-2 py-1.5 text-xs font-semibold text-primary-foreground">
                    {ounces} oz
                  </span>
                  <button
                    onClick={() => onUpdateOunces(1)}
                    disabled={remaining <= 0}
                    className="flex flex-1 items-center justify-center rounded-r-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onUpdateOunces(1)}
                  disabled={remaining < 1}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                >
                  <Plus className="h-3.5 w-3.5" /> Add 1 oz
                </button>
              )}
            </div>
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3" side="right" align="start">
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground">{nut.name}</h4>
          <NutritionLabel data={parseNutrition(nut.nutrition_facts)} />
          <div>
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Ingredients
            </h5>
            <p className="mt-1 text-xs text-muted-foreground">
              {nut.ingredients || "Ingredients info coming soon."}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
