import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  item_name: string;
  item_description: string | null;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  total_price: number;
  status: string;
  notes: string | null;
  payment_method: string | null;
  order_number: number;
  order_items: OrderItem[];
};

const STATUS_CYCLE = ["pending", "completed", "cancelled"];

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cycleStatus = (order: Order) => {
    const idx = STATUS_CYCLE.indexOf(order.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    statusMutation.mutate({ id: order.id, status: next });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No orders yet.</p>
      </div>
    );
  }

  const statusClasses = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "completed": return "bg-green-100 text-green-800 hover:bg-green-200";
      case "cancelled": return "bg-red-100 text-red-800 hover:bg-red-200";
      default: return "bg-secondary text-foreground hover:bg-secondary/80";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-display text-xl font-bold text-foreground">
        Orders ({orders.length})
      </h2>
      <p className="text-xs text-muted-foreground">Click status to change · Double-click row for details</p>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onDoubleClick={() => setSelectedOrder(order)}
              >
                <TableCell className="font-mono text-sm font-semibold text-foreground">
                  {order.order_number}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(order.created_at).toLocaleDateString()}{" "}
                  {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-foreground">{order.customer_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{order.customer_email || ""}</div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="text-xs text-foreground">
                        {item.quantity}× {item.item_name}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-foreground">
                  ${order.total_price.toFixed(2)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {order.payment_method || "—"}
                </TableCell>
                <TableCell>
                  <button
                    onClick={(e) => { e.stopPropagation(); cycleStatus(order); }}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${statusClasses(order.status)}`}
                  >
                    {order.status}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              {selectedOrder && new Date(selectedOrder.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <p className="font-medium text-foreground">{selectedOrder.customer_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium text-foreground">{selectedOrder.customer_email || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <button
                      onClick={() => cycleStatus(selectedOrder)}
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${statusClasses(selectedOrder.status)}`}
                    >
                      {selectedOrder.status}
                    </button>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="font-semibold text-foreground">${selectedOrder.total_price.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment</span>
                  <p className="font-medium text-foreground">{selectedOrder.payment_method || "—"}</p>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <span className="text-muted-foreground">Notes</span>
                  <p className="text-foreground">{selectedOrder.notes}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Items</span>
                <div className="mt-1 rounded-lg border divide-y">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="font-medium text-foreground">{item.quantity}× {item.item_name}</p>
                        {item.item_description && (
                          <p className="text-xs text-muted-foreground">{item.item_description}</p>
                        )}
                      </div>
                      <span className="font-semibold text-foreground">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
