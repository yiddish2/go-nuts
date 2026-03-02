import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LabelRequest = {
  orderId: string;
  package: {
    weight_oz: number;
    length_in?: number | null;
    width_in?: number | null;
    height_in?: number | null;
  };
  service_code?: string | null;
  label_format?: "pdf" | "png" | "zpl";
  label_layout?: "4x6" | "letter" | "A4" | "A6";
  carrier_id?: string | null;
};

type ShipEngineCarrier = {
  carrier_id: string;
  carrier_code: string;
};

type ShipEngineService = {
  service_code: string;
  is_international?: boolean;
};

const INVALID_SERVICE_CODES = new Set(["usps", "ups", "fedex", "stamps_com"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value || !value.trim()) {
    throw new Error(`Missing ${key} secret`);
  }
  return value.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const shipengineKey = requireEnv("SHIPENGINE_API_KEY");
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const shipFrom = {
      name: requireEnv("SHIPENGINE_FROM_NAME"),
      phone: requireEnv("SHIPENGINE_FROM_PHONE"),
      address_line1: requireEnv("SHIPENGINE_FROM_ADDRESS1"),
      address_line2: Deno.env.get("SHIPENGINE_FROM_ADDRESS2")?.trim() || undefined,
      city_locality: requireEnv("SHIPENGINE_FROM_CITY"),
      state_province: requireEnv("SHIPENGINE_FROM_STATE"),
      postal_code: requireEnv("SHIPENGINE_FROM_ZIP"),
      country_code: requireEnv("SHIPENGINE_FROM_COUNTRY"),
    };

    const body = (await req.json()) as LabelRequest;
    const orderId = String(body?.orderId || "").trim();
    const weightOz = Number(body?.package?.weight_oz || 0);
    const lengthIn = body?.package?.length_in ?? null;
    const widthIn = body?.package?.width_in ?? null;
    const heightIn = body?.package?.height_in ?? null;

    if (!orderId || !Number.isFinite(weightOz) || weightOz <= 0) {
      return json({ error: "Invalid orderId or package weight" }, 400);
    }

    const labelFormat = (body.label_format || "pdf") as "pdf" | "png" | "zpl";
    const labelLayout = (body.label_layout || "4x6") as "4x6" | "letter" | "A4" | "A6";
    const rawServiceCode = String(body.service_code || "").trim().toLowerCase();
    let serviceCode = rawServiceCode && !INVALID_SERVICE_CODES.has(rawServiceCode) ? rawServiceCode : null;

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return json({ error: orderError?.message || "Order not found" }, 404);
    }

    if (!order.shipping_address1 || !order.shipping_city || !order.shipping_state || !order.shipping_zip || !order.shipping_country) {
      return json({ error: "Order is missing shipping address" }, 400);
    }

    let carrierId = body.carrier_id || null;
    let carrierCode: string | null = null;
    if (!carrierId) {
      const carrierRes = await fetch("https://api.shipengine.com/v1/carriers", {
        headers: { "API-Key": shipengineKey },
      });
      const carrierData = await carrierRes.json();
      if (!carrierRes.ok) {
        return json({ error: carrierData?.message || "Failed to fetch carriers" }, 400);
      }
      const carriers: ShipEngineCarrier[] = carrierData?.carriers || [];
      const preferred = ["stamps_com", "usps", "ups", "fedex"];
      const match = carriers.find((c) => preferred.includes(c.carrier_code));
      const chosenCarrier = match || carriers[0] || null;
      carrierId = chosenCarrier?.carrier_id || null;
      carrierCode = chosenCarrier?.carrier_code || null;
      if (!carrierId) {
        return json({ error: "No carrier accounts available" }, 400);
      }
    } else {
      const carrierRes = await fetch("https://api.shipengine.com/v1/carriers", {
        headers: { "API-Key": shipengineKey },
      });
      if (carrierRes.ok) {
        const carrierData = await carrierRes.json();
        const carriers: ShipEngineCarrier[] = carrierData?.carriers || [];
        carrierCode = carriers.find((c) => c.carrier_id === carrierId)?.carrier_code || null;
      }
    }

    const servicesRes = await fetch(`https://api.shipengine.com/v1/carriers/${carrierId}/services`, {
      headers: { "API-Key": shipengineKey },
    });
    const servicesData = await servicesRes.json();
    if (!servicesRes.ok) {
      return json({ error: servicesData?.message || "Failed to fetch carrier services" }, 400);
    }

    const services: ShipEngineService[] = servicesData?.services || [];
    const availableCodes = new Set(services.map((s) => s.service_code).filter(Boolean));

    if (serviceCode && !availableCodes.has(serviceCode)) {
      const examples = services.slice(0, 6).map((s) => s.service_code);
      return json(
        {
          error: `Invalid service_code '${serviceCode}' for this carrier.`,
          valid_service_codes: examples,
        },
        400,
      );
    }

    if (!serviceCode) {
      const preferredByCarrier: Record<string, string[]> = {
        usps: ["usps_ground_advantage", "usps_priority_mail", "usps_priority_mail_express"],
        stamps_com: ["usps_ground_advantage", "usps_priority_mail", "usps_priority_mail_express"],
        ups: ["ups_ground", "ups_next_day_air"],
        fedex: ["fedex_ground", "fedex_2_day", "fedex_priority_overnight"],
      };
      const preferred = carrierCode ? preferredByCarrier[carrierCode] || [] : [];
      serviceCode =
        preferred.find((code) => availableCodes.has(code)) ||
        services.find((s) => !s.is_international)?.service_code ||
        services[0]?.service_code ||
        null;
    }

    if (!serviceCode) {
      return json({ error: "No valid service_code available for selected carrier" }, 400);
    }

    const packages: Record<string, unknown>[] = [
      {
        weight: { value: weightOz, unit: "ounce" },
      },
    ];

    if (lengthIn && widthIn && heightIn) {
      packages[0].dimensions = {
        length: Number(lengthIn),
        width: Number(widthIn),
        height: Number(heightIn),
        unit: "inch",
      };
    }

    const labelRes = await fetch("https://api.shipengine.com/v1/labels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-Key": shipengineKey,
      },
      body: JSON.stringify({
        label_format: labelFormat,
        label_layout: labelLayout,
        shipment: {
          carrier_id: carrierId,
          service_code: serviceCode,
          ship_to: {
            name: order.customer_name || "Customer",
            phone: order.shipping_phone || undefined,
            address_line1: order.shipping_address1,
            address_line2: order.shipping_address2 || undefined,
            city_locality: order.shipping_city,
            state_province: order.shipping_state,
            postal_code: order.shipping_zip,
            country_code: order.shipping_country,
          },
          ship_from: shipFrom,
          packages,
        },
      }),
    });

    const labelData = await labelRes.json();
    if (!labelRes.ok) {
      return json({ error: labelData?.message || labelData?.errors || "Label creation failed" }, 400);
    }

    const update = {
      shipping_weight_oz: weightOz,
      shipping_length_in: lengthIn,
      shipping_width_in: widthIn,
      shipping_height_in: heightIn,
      shipengine_label_id: labelData?.label_id || null,
      shipengine_shipment_id: labelData?.shipment_id || null,
      shipengine_tracking_number: labelData?.tracking_number || null,
      shipengine_label_url: labelData?.label_download?.pdf || labelData?.label_download?.href || null,
      shipengine_service_code: serviceCode,
      shipengine_carrier_id: carrierId,
      shipengine_label_created_at: new Date().toISOString(),
    };

    const { error: updateError } = await db.from("orders").update(update).eq("id", orderId);
    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    return json({ ok: true, label: labelData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
