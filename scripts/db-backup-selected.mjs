import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_TABLES = [
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

async function fetchAllRows(supabase, table) {
  const pageSize = 1000;
  let from = 0;
  const all = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, to);

    if (error) {
      throw new Error(`Failed reading ${table}: ${error.message}`);
    }

    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const requestedTables = (env.BACKUP_TABLES || "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const tables = requestedTables.length > 0 ? requestedTables : DEFAULT_TABLES;

if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL");
  process.exit(1);
}
if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(process.cwd(), "backups", stamp);
fs.mkdirSync(backupDir, { recursive: true });

const payload = {
  meta: {
    created_at: new Date().toISOString(),
    project_url: supabaseUrl,
    tables,
  },
  data: {},
};

for (const table of tables) {
  const rows = await fetchAllRows(supabase, table);
  payload.data[table] = rows;
  console.log(`Backed up ${table}: ${rows.length} rows`);
}

const outPath = path.join(backupDir, "selected-data.json");
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Backup written: ${outPath}`);
