import "dotenv/config";
import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = path.resolve(__dirname, "..", "drizzle");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function applyMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[migrations] DATABASE_URL não configurada.");
    process.exit(1);
  }

  const maxAttempts = Number(process.env.DB_MIGRATION_ATTEMPTS ?? 30);
  const delayMs = Number(process.env.DB_MIGRATION_DELAY_MS ?? 2000);

  const pool = new pg.Pool({ connectionString });
  let client;

  try {
    // Conexão com retry
    let connected = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        client = await pool.connect();
        console.log(`[migrations] Conectado ao PostgreSQL na tentativa ${attempt}`);
        connected = true;
        break;
      } catch (error) {
        console.log(`[migrations] Tentativa ${attempt} falhou, tentando novamente em ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }

    if (!connected) {
      throw new Error("Não foi possível conectar ao banco de dados após várias tentativas.");
    }

    // 1. Criar tabela de controle de migrations se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 2. Listar arquivos .sql na pasta drizzle
    const files = await fs.readdir(DRIZZLE_DIR);
    const sqlFiles = files
      .filter(f => f.endsWith(".sql"))
      .sort(); // Ordenar por nome (0001, 0002, ...)

    console.log(`[migrations] Encontradas ${sqlFiles.length} migrations no diretório.`);

    // 3. Verificar quais já foram aplicadas
    const { rows: appliedRows } = await client.query("SELECT name FROM schema_migrations");
    const appliedNames = new Set(appliedRows.map(r => r.name));

    // 4. Aplicar apenas as pendentes
    for (const file of sqlFiles) {
      if (appliedNames.has(file)) {
        console.log(`[migrations] Já aplicada: ${file}`);
        continue;
      }

      console.log(`[migrations] Aplicando: ${file}...`);
      const sql = await fs.readFile(path.join(DRIZZLE_DIR, file), "utf-8");

      await client.query("BEGIN");
      try {
        // Executa o SQL da migration
        await client.query(sql);
        // Registra a migration como aplicada
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`[migrations] Sucesso: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`[migrations] Erro em ${file}:`, err.message);
        throw err;
      }
    }

    console.log("[migrations] Todas as migrations foram verificadas/aplicadas.");
  } catch (error) {
    console.error("[migrations] Falha crítica:", error);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

applyMigrations();
