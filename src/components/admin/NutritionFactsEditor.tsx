import { NutritionData } from "@/components/NutritionLabel";

type Props = {
  data: NutritionData;
  onChange: (data: NutritionData) => void;
};

const FIELDS: { key: keyof NutritionData; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "" },
  { key: "totalFat", label: "Total Fat", unit: "g" },
  { key: "saturatedFat", label: "  Saturated Fat", unit: "g" },
  { key: "transFat", label: "  Trans Fat", unit: "g" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "totalCarbs", label: "Total Carbs", unit: "g" },
  { key: "dietaryFiber", label: "  Dietary Fiber", unit: "g" },
  { key: "totalSugars", label: "  Total Sugars", unit: "g" },
  { key: "protein", label: "Protein", unit: "g" },
];

export default function NutritionFactsEditor({ data, onChange }: Props) {
  const update = (key: keyof NutritionData, val: string) => {
    const num = val === "" ? null : parseFloat(val);
    onChange({ ...data, [key]: num !== null && isNaN(num) ? null : num });
  };

  return (
    <div className="rounded-lg border bg-white p-3">
      <h4 className="mb-2 text-xs font-bold text-black uppercase tracking-wide">
        Nutrition Facts (per 1 oz)
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <label className="flex-1 text-xs text-black whitespace-nowrap">
              {f.label} {f.unit && <span className="text-gray-400">({f.unit})</span>}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={data[f.key] ?? ""}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-16 rounded border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
              placeholder="—"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
