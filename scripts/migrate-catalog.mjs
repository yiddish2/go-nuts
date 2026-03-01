import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    out[key] = value;
  }
  return out;
}

function loadEnv() {
  const root = process.cwd();
  const fromFiles = {
    ...readEnvFile(path.join(root, ".env")),
    ...readEnvFile(path.join(root, ".env.local")),
  };
  return { ...fromFiles, ...process.env };
}

const env = loadEnv();
const sourceUrl = env.SOURCE_SUPABASE_URL;
const sourceAnonKey = env.SOURCE_SUPABASE_ANON_KEY;
const targetUrl = env.TARGET_SUPABASE_URL || env.VITE_SUPABASE_URL;
const targetServiceRoleKey = env.TARGET_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = String(env.DRY_RUN || "").toLowerCase() === "true";
const replaceCatalog = String(env.CATALOG_REPLACE || "").toLowerCase() === "true";

if (!sourceUrl || !sourceAnonKey) {
  console.error("Missing SOURCE_SUPABASE_URL or SOURCE_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!targetUrl || !targetServiceRoleKey) {
  console.error("Missing TARGET_SUPABASE_URL/VITE_SUPABASE_URL or TARGET_SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const source = createClient(sourceUrl, sourceAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const target = createClient(targetUrl, targetServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchSourceCatalog() {
  const nutsRes = await source
    .from("nuts")
    .select("name,image,price_per_ounce,in_stock,nutrition_facts,ingredients")
    .order("name");
  if (nutsRes.error) throw new Error(`Source nuts read failed: ${nutsRes.error.message}`);

  const containersRes = await source
    .from("containers")
    .select("name,max_ounces,base_price")
    .order("max_ounces");
  if (containersRes.error) throw new Error(`Source containers read failed: ${containersRes.error.message}`);

  return {
    nuts: nutsRes.data || [],
    containers: containersRes.data || [],
  };
}

async function upsertNuts(nuts) {
  if (nuts.length === 0) return;
  const { error } = await target.from("nuts").upsert(nuts, { onConflict: "name" });
  if (error) throw new Error(`Target nuts upsert failed: ${error.message}`);
}

async function upsertContainers(containers) {
  if (containers.length === 0) return;
  const { data: existing, error: readError } = await target
    .from("containers")
    .select("id,name");
  if (readError) throw new Error(`Target containers read failed: ${readError.message}`);

  const byName = new Map((existing || []).map((c) => [String(c.name).toLowerCase(), c.id]));
  for (const container of containers) {
    const key = String(container.name).toLowerCase();
    const existingId = byName.get(key);
    if (existingId) {
      const { error } = await target
        .from("containers")
        .update({
          max_ounces: container.max_ounces,
          base_price: container.base_price,
        })
        .eq("id", existingId);
      if (error) throw new Error(`Target container update failed (${container.name}): ${error.message}`);
    } else {
      const { error } = await target.from("containers").insert(container);
      if (error) throw new Error(`Target container insert failed (${container.name}): ${error.message}`);
    }
  }
}

async function clearCatalog() {
  const delMixItems = await target.from("custom_mix_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delMixItems.error) throw new Error(`Target clear custom_mix_items failed: ${delMixItems.error.message}`);
  const delMixes = await target.from("custom_mixes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delMixes.error) throw new Error(`Target clear custom_mixes failed: ${delMixes.error.message}`);
  const delNuts = await target.from("nuts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delNuts.error) throw new Error(`Target clear nuts failed: ${delNuts.error.message}`);
  const delContainers = await target.from("containers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delContainers.error) throw new Error(`Target clear containers failed: ${delContainers.error.message}`);
}

const { nuts, containers } = await fetchSourceCatalog();
console.log(`Source catalog: ${nuts.length} nuts, ${containers.length} containers`);

if (dryRun) {
  console.log("DRY_RUN=true -> no writes performed.");
  process.exit(0);
}

if (replaceCatalog) {
  await clearCatalog();
  console.log("Target catalog cleared (replace mode).");
}

await upsertNuts(nuts);
await upsertContainers(containers);

console.log("Catalog migration complete.");
