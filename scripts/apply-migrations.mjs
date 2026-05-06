import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const migrationPath = resolve(rootDir, "drizzle/0001_rifas_postgres.sql");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[migrations] DATABASE_URL nao configurada.");
  process.exit(1);
}

const maxAttempts = Number(process.env.DB_MIGRATION_ATTEMPTS ?? 30);
const delayMs = Number(process.env.DB_MIGRATION_DELAY_MS ?? 2000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function connectWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      console.log("[migrations] Conectado na tentativa " + attempt);
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

const client = await connectWithRetry();
try {
  const exists = await client.query("select to_regclass('public.rifas') as table_name");
  if (exists.rows[0]?.table_name) {
    await client.query('ALTER TABLE "rifas" ADD COLUMN IF NOT EXISTS "premio" varchar(255), ADD COLUMN IF NOT EXISTS "dataSorteio" varchar(120)');
    console.log("[migrations] Colunas verificadas com sucesso.");
  } else {
    const sql = await readFile(migrationPath, "utf8");
    await client.query(sql);
    console.log("[migrations] Banco preparado com sucesso.");
  }
} finally {
  await client.end();
}
