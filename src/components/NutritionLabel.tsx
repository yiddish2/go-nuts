export type NutritionData = {
  calories: number | null;
  totalFat: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  totalCarbs: number | null;
  dietaryFiber: number | null;
  totalSugars: number | null;
  protein: number | null;
};

export const EMPTY_NUTRITION: NutritionData = {
  calories: null,
  totalFat: null,
  saturatedFat: null,
  transFat: null,
  cholesterol: null,
  sodium: null,
  totalCarbs: null,
  dietaryFiber: null,
  totalSugars: null,
  protein: null,
};

export function parseNutrition(raw: string | null): NutritionData {
  if (!raw) return { ...EMPTY_NUTRITION };
  try {
    const parsed = JSON.parse(raw);
    return { ...EMPTY_NUTRITION, ...parsed };
  } catch {
    return { ...EMPTY_NUTRITION };
  }
}

export function serializeNutrition(data: NutritionData): string {
  return JSON.stringify(data);
}

// FDA daily values
const DAILY_VALUES: Partial<Record<keyof NutritionData, number>> = {
  totalFat: 78,
  saturatedFat: 20,
  cholesterol: 300,
  sodium: 2300,
  totalCarbs: 275,
  dietaryFiber: 28,
  protein: 50,
};

function getDV(key: keyof NutritionData, value: number | null): string | null {
  const dv = DAILY_VALUES[key];
  if (dv == null || value == null) return null;
  return `${Math.round((value / dv) * 100)}%`;
}

function Row({
  label,
  value,
  unit,
  dvKey,
  bold = false,
  indent = false,
}: {
  label: string;
  value: number | null;
  unit: string;
  dvKey?: keyof NutritionData;
  bold?: boolean;
  indent?: boolean;
}) {
  const dv = dvKey ? getDV(dvKey, value) : null;
  return (
    <div
      className={`flex items-baseline justify-between border-b border-black/20 py-0.5 ${
        indent ? "pl-4" : ""
      }`}
    >
      <span className="flex-1">
        <span className={bold ? "font-bold text-black" : "text-black"}>
          {label}
        </span>{" "}
        <span className="text-black">
          {value !== null ? `${value}${unit}` : "—"}
        </span>
      </span>
      {dv !== null && (
        <span className="font-bold text-black">{dv}</span>
      )}
    </div>
  );
}

export default function NutritionLabel({ data }: { data: NutritionData }) {
  return (
    <div className="rounded border-2 border-black bg-white p-3 text-xs leading-tight">
      <h4 className="border-b-8 border-black pb-0.5 text-base font-extrabold text-black">
        Nutrition Facts
      </h4>
      <p className="border-b border-black py-0.5 text-[10px] text-black">
        Serving Size 1 oz (28g)
      </p>

      <div className="border-b-4 border-black py-0.5">
        <div className="flex justify-between">
          <span className="text-sm font-extrabold text-black">Calories</span>
          <span className="text-sm font-extrabold text-black">
            {data.calories !== null ? data.calories : "—"}
          </span>
        </div>
      </div>

      <div className="flex justify-end border-b border-black/20 py-0.5">
        <span className="text-[10px] font-bold text-black">% Daily Value*</span>
      </div>

      <div className="space-y-0">
        <Row label="Total Fat" value={data.totalFat} unit="g" dvKey="totalFat" bold />
        <Row label="Saturated Fat" value={data.saturatedFat} unit="g" dvKey="saturatedFat" indent />
        <Row label="Trans Fat" value={data.transFat} unit="g" indent />
        <Row label="Cholesterol" value={data.cholesterol} unit="mg" dvKey="cholesterol" bold />
        <Row label="Sodium" value={data.sodium} unit="mg" dvKey="sodium" bold />
        <Row label="Total Carb." value={data.totalCarbs} unit="g" dvKey="totalCarbs" bold />
        <Row label="Dietary Fiber" value={data.dietaryFiber} unit="g" dvKey="dietaryFiber" indent />
        <Row label="Total Sugars" value={data.totalSugars} unit="g" indent />
        <Row label="Protein" value={data.protein} unit="g" dvKey="protein" bold />
      </div>

      <p className="mt-1 border-t border-black pt-1 text-[9px] text-black/70">
        * Percent Daily Values are based on a 2,000 calorie diet.
      </p>
    </div>
  );
}
