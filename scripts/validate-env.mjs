import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILES = [".env.local", ".env"];
const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

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

const fileEnv = {};
for (const file of ENV_FILES) {
  Object.assign(fileEnv, readEnvFile(path.join(ROOT, file)));
}

const env = { ...fileEnv, ...process.env };
const missing = REQUIRED.filter((key) => !env[key] || !String(env[key]).trim());

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  for (const key of missing) console.error(`- ${key}`);
  console.error("Copy .env.example to .env and fill in values.");
  process.exit(1);
}

try {
  // Validate URL shape to catch typos early.
  new URL(String(env.VITE_SUPABASE_URL));
} catch {
  console.error("VITE_SUPABASE_URL is not a valid URL.");
  process.exit(1);
}

const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY);
if (key.length < 20) {
  console.error("VITE_SUPABASE_PUBLISHABLE_KEY looks too short.");
  process.exit(1);
}

console.log("Environment check passed.");
