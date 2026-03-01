import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type AllowedEmail = {
  id: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
};

export default function AdminAllowedEmails() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");

  const { data: emails, isLoading } = useQuery({
    queryKey: ["allowed-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_emails")
        .select("*")
        .order("role")
        .order("email");
      if (error) throw error;
      return data as AllowedEmail[];
    },
  });

  const addEmail = useMutation({
    mutationFn: async () => {
      if (!newEmail.trim()) throw new Error("Email is required");
      const { error } = await supabase.from("allowed_emails").insert({
        email: newEmail.trim().toLowerCase(),
        role: newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-emails"] });
      setNewEmail("");
      toast.success("Email added!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEmail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("allowed_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-emails"] });
      toast.success("Email removed!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const admins = emails?.filter((e) => e.role === "admin") || [];
  const workers = emails?.filter((e) => e.role === "user") || [];

  return (
    <div className="space-y-8">
      {/* Add new email */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Add Email to Whitelist</h3>
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="email@example.com"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
            className="rounded-lg border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="admin">Admin</option>
            <option value="user">Worker</option>
          </select>
          <button
            onClick={() => addEmail.mutate()}
            disabled={addEmail.isPending}
            className="flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:scale-[1.02] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Admin list */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Admins</h3>
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin emails added yet.</p>
        ) : (
          <div className="space-y-2">
            {admins.map((entry) => (
              <EmailRow key={entry.id} entry={entry} onDelete={deleteEmail.mutate} />
            ))}
          </div>
        )}
      </div>

      {/* Worker list */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Workers</h3>
        {workers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No worker emails added yet.</p>
        ) : (
          <div className="space-y-2">
            {workers.map((entry) => (
              <EmailRow key={entry.id} entry={entry} onDelete={deleteEmail.mutate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailRow({ entry, onDelete }: { entry: AllowedEmail; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <span className="text-sm text-foreground">{entry.email}</span>
      <button
        onClick={() => onDelete(entry.id)}
        className="rounded-full p-2 text-muted-foreground hover:text-destructive"
        title="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
