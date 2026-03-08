import { useEffect, useState } from "react";
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
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  shipping_phone: string | null;
  shipping_weight_oz: number | null;
  shipping_length_in: number | null;
  shipping_width_in: number | null;
  shipping_height_in: number | null;
  shipengine_tracking_number: string | null;
  shipengine_label_url: string | null;
  shipengine_label_created_at: string | null;
  shipengine_service_code: string | null;
  order_items: OrderItem[];
};

const STATUS_CYCLE = ["pending", "completed", "cancelled"];
const INVALID_SERVICE_CODES = new Set(["usps", "ups", "fedex", "stamps_com"]);

const csvEscape = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
};

const buildItemsSummary = (items: OrderItem[]) =>
  items.map((item) => `${item.quantity}x ${item.item_name}`).join("; ");

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [labelWeight, setLabelWeight] = useState("");
  const [labelLength, setLabelLength] = useState("");
  const [labelWidth, setLabelWidth] = useState("");
  const [labelHeight, setLabelHeight] = useState("");
  const [labelService, setLabelService] = useState("usps_ground_advantage");
  const [creatingLabel, setCreatingLabel] = useState(false);

  useEffect(() => {
    if (!selectedOrder) return;
    setLabelWeight(selectedOrder.shipping_weight_oz ? String(selectedOrder.shipping_weight_oz) : "");
    setLabelLength(selectedOrder.shipping_length_in ? String(selectedOrder.shipping_length_in) : "");
    setLabelWidth(selectedOrder.shipping_width_in ? String(selectedOrder.shipping_width_in) : "");
    setLabelHeight(selectedOrder.shipping_height_in ? String(selectedOrder.shipping_height_in) : "");
    setLabelService(selectedOrder.shipengine_service_code || "usps_ground_advantage");
  }, [selectedOrder?.id]);

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

  const cancelOrder = (order: Order) => {
    if (order.status === "cancelled") return;
    const confirmed = window.confirm(`Cancel order #${order.order_number}?`);
    if (!confirmed) return;
    statusMutation.mutate({ id: order.id, status: "cancelled" });
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

  const exportCsv = () => {
    if (!orders || orders.length === 0) return;
    const headers = [
      "Order Number",
      "Created At",
      "Customer Name",
      "Email",
      "Phone",
      "Address 1",
      "Address 2",
      "City",
      "State",
      "ZIP",
      "Country",
      "Items",
      "Total",
      "Status",
    ];
    const rows = orders.map((order) => [
      order.order_number,
      new Date(order.created_at).toISOString(),
      order.customer_name,
      order.customer_email,
      order.shipping_phone,
      order.shipping_address1,
      order.shipping_address2,
      order.shipping_city,
      order.shipping_state,
      order.shipping_zip,
      order.shipping_country,
      buildItemsSummary(order.order_items),
      order.total_price.toFixed(2),
      order.status,
    ]);
    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `go-nuts-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const createLabel = async () => {
    if (!selectedOrder) return;
    const weightOz = Number(labelWeight);
    if (!Number.isFinite(weightOz) || weightOz <= 0) {
      toast.error("Enter a valid weight in ounces.");
      return;
    }

    const normalizedService = labelService.trim().toLowerCase();
    if (normalizedService && INVALID_SERVICE_CODES.has(normalizedService)) {
      toast.error("Use a service code like usps_ground_advantage, not a carrier code like usps.");
      return;
    }

    setCreatingLabel(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error("You must be logged in to create labels.");
      }
      const refresh = await supabase.auth.refreshSession();
      if (refresh.error) {
        throw refresh.error;
      }
      const accessToken =
        refresh.data.session?.access_token || sessionData.session.access_token;
      if (!accessToken) {
        throw new Error("Session expired. Please sign in again.");
      }

      const { data, error } = await supabase.functions.invoke("create-shipping-label", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          orderId: selectedOrder.id,
          package: {
            weight_oz: weightOz,
            length_in: labelLength ? Number(labelLength) : null,
            width_in: labelWidth ? Number(labelWidth) : null,
            height_in: labelHeight ? Number(labelHeight) : null,
          },
          service_code: normalizedService || null,
          label_format: "pdf",
          label_layout: "4x6",
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("Label creation failed.");
      toast.success("Label created.");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create label.");
      console.error(err);
    } finally {
      setCreatingLabel(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-display text-xl font-bold text-foreground">
          Orders ({orders.length})
        </h2>
        <button
          onClick={exportCsv}
          className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Export CSV (Pirate Ship)
        </button>
      </div>
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
              <TableHead>Actions</TableHead>
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
                <TableCell>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelOrder(order);
                    }}
                    disabled={order.status === "cancelled" || statusMutation.isPending}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel Order
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
                <div className="flex items-end">
                  <button
                    onClick={() => cancelOrder(selectedOrder)}
                    disabled={selectedOrder.status === "cancelled" || statusMutation.isPending}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel Order
                  </button>
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
              <div>
                <span className="text-muted-foreground">Shipping</span>
                <div className="mt-1 space-y-1 text-foreground">
                  <div>{selectedOrder.customer_name || "—"}</div>
                  <div>{selectedOrder.shipping_address1 || "—"}</div>
                  {selectedOrder.shipping_address2 && <div>{selectedOrder.shipping_address2}</div>}
                  <div>
                    {[selectedOrder.shipping_city, selectedOrder.shipping_state, selectedOrder.shipping_zip]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                  <div>{selectedOrder.shipping_country || "—"}</div>
                  {selectedOrder.shipping_phone && (
                    <div className="text-muted-foreground">Phone: {selectedOrder.shipping_phone}</div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Shipping Label</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="Weight (oz)"
                    inputMode="decimal"
                    value={labelWeight}
                    onChange={(e) => setLabelWeight(e.target.value)}
                    className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <input
                    placeholder="Service code (e.g., usps_ground_advantage)"
                    value={labelService}
                    onChange={(e) => setLabelService(e.target.value)}
                    className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <input
                    placeholder="Length (in)"
                    inputMode="decimal"
                    value={labelLength}
                    onChange={(e) => setLabelLength(e.target.value)}
                    className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <input
                    placeholder="Width (in)"
                    inputMode="decimal"
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(e.target.value)}
                    className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <input
                    placeholder="Height (in)"
                    inputMode="decimal"
                    value={labelHeight}
                    onChange={(e) => setLabelHeight(e.target.value)}
                    className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={createLabel}
                    disabled={creatingLabel}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {creatingLabel ? "Creating…" : "Create Label (PDF 4x6)"}
                  </button>
                  {selectedOrder.shipengine_label_url && (
                    <a
                      href={selectedOrder.shipengine_label_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-primary underline"
                    >
                      Download Label
                    </a>
                  )}
                  {selectedOrder.shipengine_tracking_number && (
                    <span className="text-xs text-muted-foreground">
                      Tracking: {selectedOrder.shipengine_tracking_number}
                    </span>
                  )}
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
