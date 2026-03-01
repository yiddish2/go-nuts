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

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payload.length % 4 === 0 ? "" : "=".repeat(4 - (payload.length % 4));
    const json = Buffer.from(payload + pad, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractScriptUrls(html, baseUrl) {
  const urls = [];
  const srcRe = /<script[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = srcRe.exec(html)) !== null) {
    try {
      urls.push(new URL(match[1], baseUrl).toString());
    } catch {
      // Ignore malformed script src.
    }
  }
  return [...new Set(urls)];
}

function extractCandidates(text) {
  const urls = text.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/g) || [];
  const jwtCandidates = text.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || [];
  return { urls, jwtCandidates };
}

function pickAnonKey(jwtCandidates) {
  for (const token of jwtCandidates) {
    const payload = decodeJwtPayload(token);
    if (!payload) continue;
    if (payload.iss === "supabase" && payload.role === "anon") {
      return token;
    }
  }
  return null;
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

async function main() {
  const env = loadEnv();
  const sourceSiteUrl = env.SOURCE_SITE_URL || "https://go-nuts.shop";
  const targetSupabaseUrl = env.TARGET_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const targetServiceRoleKey = env.TARGET_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const dryRun = String(env.DRY_RUN || "").toLowerCase() === "true";

  if (!targetSupabaseUrl) {
    console.error("Missing TARGET_SUPABASE_URL or VITE_SUPABASE_URL");
    process.exit(1);
  }
  if (!dryRun && !targetServiceRoleKey) {
    console.error("Missing TARGET_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log(`Fetching site: ${sourceSiteUrl}`);
  const html = await fetchText(sourceSiteUrl);
  const scriptUrls = extractScriptUrls(html, sourceSiteUrl);
  if (scriptUrls.length === 0) {
    throw new Error("No script URLs found on source site.");
  }
  console.log(`Discovered ${scriptUrls.length} script assets`);

  const foundUrls = new Set();
  const foundJwt = [];

  const htmlCandidates = extractCandidates(html);
  for (const u of htmlCandidates.urls) foundUrls.add(u);
  foundJwt.push(...htmlCandidates.jwtCandidates);

  for (const scriptUrl of scriptUrls) {
    try {
      const js = await fetchText(scriptUrl);
      const c = extractCandidates(js);
      for (const u of c.urls) foundUrls.add(u);
      foundJwt.push(...c.jwtCandidates);
    } catch (err) {
      console.warn(`Skipping script (failed fetch): ${scriptUrl}`);
    }
  }

  const sourceSupabaseUrl = [...foundUrls][0] || null;
  const sourceAnonKey = pickAnonKey(foundJwt);

  if (!sourceSupabaseUrl || !sourceAnonKey) {
    throw new Error("Could not extract source Supabase URL + anon key from site assets.");
  }

  console.log(`Source Supabase URL: ${sourceSupabaseUrl}`);

  const source = createClient(sourceSupabaseUrl, sourceAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sourceNuts, error: readError } = await source
    .from("nuts")
    .select("name,image,price_per_ounce,in_stock,nutrition_facts,ingredients")
    .order("name");

  if (readError) {
    throw new Error(`Source catalog read failed: ${readError.message}`);
  }

  const nuts = (sourceNuts || []).map((row) => ({
    name: row.name,
    image: row.image ?? null,
    price_per_ounce: row.price_per_ounce ?? 0,
    in_stock: row.in_stock ?? true,
    nutrition_facts: row.nutrition_facts ?? null,
    ingredients: row.ingredients ?? null,
  }));

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "exports");
  fs.mkdirSync(outDir, { recursive: true });
  const snapshot = path.join(outDir, `scraped-catalog-${stamp}.json`);
  fs.writeFileSync(snapshot, JSON.stringify({ sourceSiteUrl, sourceSupabaseUrl, nuts }, null, 2));
  console.log(`Saved snapshot: ${snapshot}`);
  console.log(`Scraped nuts: ${nuts.length}`);

  if (dryRun) {
    console.log("DRY_RUN=true -> import skipped.");
    return;
  }

  const target = createClient(targetSupabaseUrl, targetServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: writeError } = await target.from("nuts").upsert(nuts, { onConflict: "name" });
  if (writeError) {
    throw new Error(`Target import failed: ${writeError.message}`);
  }

  console.log(`Imported/updated nuts in target DB: ${nuts.length}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
