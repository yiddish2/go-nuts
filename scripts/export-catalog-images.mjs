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

function sanitizeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getExtFromUrl(url) {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (!match) return "jpg";
  return match[1].toLowerCase();
}

async function downloadImage(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from("nuts")
  .select("name,price_per_ounce,image")
  .order("name");

if (error) {
  console.error(`Failed to read nuts: ${error.message}`);
  process.exit(1);
}

const allRows = data || [];
const rows = allRows.filter((row) => row.image);
const missingImageRows = allRows.filter((row) => !row.image);

if (allRows.length === 0) {
  console.log("No items found in nuts table.");
  process.exit(0);
}

const outDir = path.join(process.cwd(), "exports", "catalog-images");
fs.mkdirSync(outDir, { recursive: true });

const usedNames = new Set();
let ok = 0;
let fail = 0;

for (const row of rows) {
  const safeName = sanitizeName(row.name || "item");
  const price = Number(row.price_per_ounce ?? 0).toFixed(2);
  const ext = getExtFromUrl(row.image);

  let base = `${safeName}-$${price}`;
  let finalName = `${base}.${ext}`;
  let n = 2;
  while (usedNames.has(finalName) || fs.existsSync(path.join(outDir, finalName))) {
    finalName = `${base}-${n}.${ext}`;
    n += 1;
  }
  usedNames.add(finalName);

  const outPath = path.join(outDir, finalName);
  try {
    await downloadImage(row.image, outPath);
    ok += 1;
    console.log(`Saved: ${finalName}`);
  } catch (err) {
    fail += 1;
    console.error(`Failed: ${row.name} (${row.image})`);
  }
}

console.log(`Done. Saved ${ok}, failed ${fail}. Output: ${outDir}`);
if (missingImageRows.length > 0) {
  console.log(`Skipped ${missingImageRows.length} items with no image URL in DB.`);
}
