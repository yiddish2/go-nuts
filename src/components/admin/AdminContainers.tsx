import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

type Container = {
  id: string;
  name: string;
  max_ounces: number;
  base_price: number;
};

export default function AdminContainers() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newMaxOz, setNewMaxOz] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const { data: containers, isLoading } = useQuery({
    queryKey: ["admin-containers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("containers").select("*").order("max_ounces");
      if (error) throw error;
      return data as Container[];
    },
  });

  const addContainer = useMutation({
    mutationFn: async () => {
      const maxOz = parseFloat(newMaxOz);
      const price = parseFloat(newPrice);
      if (!newName.trim() || isNaN(maxOz) || maxOz <= 0 || isNaN(price) || price < 0)
        throw new Error("Invalid input");
      const { error } = await supabase.from("containers").insert({
        name: newName.trim(),
        max_ounces: maxOz,
        base_price: price,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-containers"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      setNewName("");
      setNewMaxOz("");
      setNewPrice("");
      toast.success("Container added!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateContainer = useMutation({
    mutationFn: async (c: Partial<Container> & { id: string }) => {
      const { id, ...updates } = c;
      const { error } = await supabase.from("containers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-containers"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      toast.success("Container updated!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteContainer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("containers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-containers"] });
      queryClient.invalidateQueries({ queryKey: ["containers"] });
      toast.success("Container deleted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Add New Container</h3>
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[150px] rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            placeholder="Max ounces"
            type="number"
            min="1"
            value={newMaxOz}
            onChange={(e) => setNewMaxOz(e.target.value)}
            className="w-28 rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            placeholder="Base price"
            type="number"
            step="0.01"
            min="0"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-28 rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => addContainer.mutate()}
            disabled={addContainer.isPending}
            className="flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:scale-[1.02] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {containers?.map((c) => (
          <ContainerRow key={c.id} container={c} onUpdate={updateContainer.mutate} onDelete={deleteContainer.mutate} />
        ))}
      </div>
    </div>
  );
}

function ContainerRow({
  container,
  onUpdate,
  onDelete,
}: {
  container: Container;
  onUpdate: (c: Partial<Container> & { id: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(container.name);
  const [maxOz, setMaxOz] = useState(container.max_ounces.toString());
  const [price, setPrice] = useState(container.base_price.toString());

  const dirty =
    name !== container.name ||
    maxOz !== container.max_ounces.toString() ||
    price !== container.base_price.toString();

  const handleSave = () => {
    const mOz = parseFloat(maxOz);
    const p = parseFloat(price);
    if (!name.trim() || isNaN(mOz) || mOz <= 0 || isNaN(p) || p < 0) {
      toast.error("Invalid input");
      return;
    }
    onUpdate({ id: container.id, name: name.trim(), max_ounces: mOz, base_price: p });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 min-w-[120px] rounded-lg border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Max oz</span>
        <input
          value={maxOz}
          type="number"
          min="1"
          onChange={(e) => setMaxOz(e.target.value)}
          className="w-20 rounded-lg border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Base $</span>
        <input
          value={price}
          type="number"
          step="0.01"
          min="0"
          onChange={(e) => setPrice(e.target.value)}
          className="w-20 rounded-lg border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {dirty && (
        <button onClick={handleSave} className="rounded-full bg-primary p-2 text-primary-foreground hover:scale-105" title="Save changes">
          <Save className="h-4 w-4" />
        </button>
      )}
      <button onClick={() => onDelete(container.id)} className="rounded-full p-2 text-muted-foreground hover:text-destructive" title="Delete">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
