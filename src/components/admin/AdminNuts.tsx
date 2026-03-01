import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import NutritionFactsEditor from "@/components/admin/NutritionFactsEditor";
import { parseNutrition, serializeNutrition, type NutritionData } from "@/components/NutritionLabel";

type Nut = {
  id: string;
  name: string;
  image: string | null;
  price_per_ounce: number;
  in_stock: boolean;
  nutrition_facts: string | null;
  ingredients: string | null;
};

async function uploadNutImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("nut-images").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("nut-images").getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminNuts() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: nuts, isLoading } = useQuery({
    queryKey: ["admin-nuts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nuts").select("*").order("name");
      if (error) throw error;
      return data as Nut[];
    },
  });

  const addNut = useMutation({
    mutationFn: async () => {
      const price = parseFloat(newPrice);
      if (!newName.trim() || isNaN(price) || price <= 0) throw new Error("Invalid input");
      // Check for duplicate name
      const existing = nuts?.find((n) => n.name.toLowerCase() === newName.trim().toLowerCase());
      if (existing) throw new Error("A nut with that name already exists");
      let imageUrl: string | null = null;
      if (newFile) {
        imageUrl = await uploadNutImage(newFile);
      }
      const { error } = await supabase.from("nuts").insert({
        name: newName.trim(),
        price_per_ounce: price,
        image: imageUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-nuts"] });
      queryClient.invalidateQueries({ queryKey: ["nuts"] });
      setNewName("");
      setNewPrice("");
      setNewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Nut added!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateNut = useMutation({
    mutationFn: async (nut: Partial<Nut> & { id: string }) => {
      const { id, ...updates } = nut;
      const { error } = await supabase.from("nuts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-nuts"] });
      queryClient.invalidateQueries({ queryKey: ["nuts"] });
      toast.success("Nut updated!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteNut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nuts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-nuts"] });
      queryClient.invalidateQueries({ queryKey: ["nuts"] });
      toast.success("Nut deleted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new nut */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Add New Item</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[150px] rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            placeholder="Price/oz"
            type="number"
            step="0.01"
            min="0"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-28 rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors">
              <Upload className="h-4 w-4" />
              {newFile ? newFile.name.slice(0, 20) : "Upload Image"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              />
            </label>
            {newFile && (
              <button
                onClick={() => { setNewFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="rounded-full p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => addNut.mutate()}
            disabled={addNut.isPending}
            className="flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:scale-[1.02] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Nut list */}
      <div className="space-y-3">
        {nuts?.map((nut) => (
          <NutRow key={nut.id} nut={nut} onUpdate={updateNut.mutate} onDelete={deleteNut.mutate} />
        ))}
      </div>
    </div>
  );
}

function NutRow({
  nut,
  onUpdate,
  onDelete,
}: {
  nut: Nut;
  onUpdate: (n: Partial<Nut> & { id: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(nut.name);
  const [price, setPrice] = useState(nut.price_per_ounce.toString());
  const [inStock, setInStock] = useState(nut.in_stock);
  const [nutritionData, setNutritionData] = useState<NutritionData>(parseNutrition(nut.nutrition_facts));
  const [ingredients, setIngredients] = useState(nut.ingredients || "");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty =
    name !== nut.name ||
    price !== nut.price_per_ounce.toString() ||
    inStock !== nut.in_stock ||
    newImage !== null ||
    serializeNutrition(nutritionData) !== (nut.nutrition_facts || serializeNutrition(parseNutrition(null))) ||
    ingredients !== (nut.ingredients || "");

  const handleFileChange = (file: File | null) => {
    setNewImage(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSave = async () => {
    const p = parseFloat(price);
    if (!name.trim() || isNaN(p) || p <= 0) {
      toast.error("Invalid input");
      return;
    }
    let imageUrl = nut.image;
    if (newImage) {
      try {
        imageUrl = await uploadNutImage(newImage);
      } catch (e: any) {
        toast.error("Image upload failed: " + e.message);
        return;
      }
    }
    onUpdate({
      id: nut.id,
      name: name.trim(),
      price_per_ounce: p,
      image: imageUrl,
      in_stock: inStock,
      nutrition_facts: serializeNutrition(nutritionData),
      ingredients: ingredients.trim() || null,
    });
    setNewImage(null);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
      <img
        src={previewUrl || nut.image || "/placeholder.svg"}
        alt={nut.name}
        className="h-10 w-10 rounded-md object-cover"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 min-w-[120px] rounded-lg border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">$/oz</span>
        <input
          value={price}
          type="number"
          step="0.01"
          min="0"
          onChange={(e) => setPrice(e.target.value)}
          className="w-20 rounded-lg border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-1 rounded-lg border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors">
        <Upload className="h-3.5 w-3.5" />
        {newImage ? newImage.name.slice(0, 15) : "Change Image"}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
        />
      </label>
      {newImage && (
        <button
          onClick={() => { handleFileChange(null); if (fileRef.current) fileRef.current.value = ""; }}
          className="rounded-full p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setInStock(e.target.checked)}
          className="h-4 w-4 rounded accent-primary"
        />
        In Stock
      </label>
      <div className="w-full flex flex-wrap gap-3 mt-1">
        <div className="flex-1 min-w-[300px]">
          <NutritionFactsEditor data={nutritionData} onChange={setNutritionData} />
        </div>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Ingredients..."
          rows={2}
          className="flex-1 min-w-[200px] rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {dirty && (
        <button
          onClick={handleSave}
          className="rounded-full bg-primary p-2 text-primary-foreground hover:scale-105"
          title="Save changes"
        >
          <Save className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={() => onDelete(nut.id)}
        className="rounded-full p-2 text-muted-foreground hover:text-destructive"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
