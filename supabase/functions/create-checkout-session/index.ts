import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckoutItem = {
  name: string;
  description?: string | null;
  quantity: number;
  price: number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeSecretKey) {
    return json({ error: "Missing STRIPE_SECRET_KEY secret" }, 500);
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret" }, 500);
  }

  try {
    const body = await req.json();
    const email = String(body?.email || "").trim();
    const customerName = String(body?.customerName || "").trim();
    const origin = String(body?.origin || "").trim();
    const items: CheckoutItem[] = Array.isArray(body?.items) ? body.items : [];

    if (!email || !origin || items.length === 0) {
      return json({ error: "Missing required checkout payload fields" }, 400);
    }

    const totalPrice = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    if (totalPrice <= 0) {
      return json({ error: "Total price must be greater than zero" }, 400);
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        customer_name: customerName || null,
        customer_email: email,
        total_price: Number(totalPrice.toFixed(2)),
        status: "pending",
        payment_method: "stripe_checkout",
      })
      .select("id")
      .single();

    if (orderError || !order?.id) {
      return json({ error: `Order creation failed: ${orderError?.message || "unknown"}` }, 400);
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      item_name: item.name,
      item_description: item.description || null,
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));

    const { error: itemsError } = await db.from("order_items").insert(orderItems);
    if (itemsError) {
      return json({ error: `Order items creation failed: ${itemsError.message}` }, 400);
    }

    const lineItems: Record<string, string>[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const qty = Number(item.quantity);
      const unitAmount = Math.round(Number(item.price) * 100);
      if (!item.name || qty <= 0 || unitAmount <= 0) {
        return json({ error: `Invalid item at index ${i}` }, 400);
      }
      lineItems.push({
        [`line_items[${i}][price_data][currency]`]: "usd",
        [`line_items[${i}][price_data][product_data][name]`]: item.name,
        [`line_items[${i}][price_data][product_data][description]`]: String(item.description || ""),
        [`line_items[${i}][price_data][unit_amount]`]: String(unitAmount),
        [`line_items[${i}][quantity]`]: String(qty),
      });
    }

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${origin}/checkout?success=1&order_id=${encodeURIComponent(order.id)}`);
    params.set("cancel_url", `${origin}/checkout?canceled=1&order_id=${encodeURIComponent(order.id)}`);
    params.set("customer_email", email);
    params.set("metadata[order_id]", order.id);
    if (customerName) {
      params.set("metadata[customer_name]", customerName);
    }

    for (const itemMap of lineItems) {
      for (const [k, v] of Object.entries(itemMap)) {
        params.append(k, v);
      }
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const stripeData = await stripeRes.json();
    if (!stripeRes.ok) {
      return json({ error: stripeData?.error?.message || "Stripe session creation failed" }, 400);
    }

    return json({ id: stripeData.id, url: stripeData.url, orderId: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
