import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const RESTORE_ORDER = [
  "containers",
  "nuts",
  "allowed_emails",
  "profiles",
  "user_roles",
  "orders",
  "order_items",
  "custom_mixes",
  "custom_mix_items",
  "login_attempts",
];

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
  const fileEnv = {
    ...readEnvFile(path.join(root, ".env")),
    ...readEnvFile(path.join(root, ".env.local")),
  };
  return { ...fileEnv, ...process.env };
}

async function upsertInChunks(supabase, table, rows) {
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" });
    if (error) {
      throw new Error(`Failed restoring ${table}: ${error.message}`);
    }
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const backupFile = env.BACKUP_FILE || process.argv[2];

if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL");
  process.exit(1);
}
if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!backupFile) {
  console.error("Set BACKUP_FILE or pass the backup path as arg.");
  process.exit(1);
}

const resolvedBackup = path.resolve(process.cwd(), backupFile);
if (!fs.existsSync(resolvedBackup)) {
  console.error(`Backup file not found: ${resolvedBackup}`);
  process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(resolvedBackup, "utf8"));
if (!parsed?.data || typeof parsed.data !== "object") {
  console.error("Invalid backup JSON format.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const restored = [];
for (const table of RESTORE_ORDER) {
  const rows = parsed.data[table];
  if (!Array.isArray(rows) || rows.length === 0) continue;
  await upsertInChunks(supabase, table, rows);
  restored.push(`${table}:${rows.length}`);
  console.log(`Restored ${table}: ${rows.length} rows`);
}

console.log(`Restore completed (${restored.join(", ") || "no rows"}).`);
