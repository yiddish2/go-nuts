import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

type LoginAttempt = {
  id: string;
  email: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

export default function AdminLoginAttempts() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttempts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("login_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setAttempts((data as LoginAttempt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No login attempts recorded yet.</p>;
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Error</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.email}</TableCell>
              <TableCell>
                {a.success ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-500">
                    <XCircle className="h-4 w-4" /> Failed
                  </span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{a.error_message ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(a.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
