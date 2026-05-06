// Storage local — salva arquivos no disco do servidor em /app/uploads
// Servido via rota estática /uploads/* pelo storageProxy.ts
// Não requer nenhuma variável de ambiente ou serviço externo.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Diretório de uploads: /app/uploads (persistido via volume Docker no Coolify)
const UPLOADS_DIR = resolve(__dirname, "..", "uploads");

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = resolve(UPLOADS_DIR, key);

  // Garante que o diretório existe
  await mkdir(dirname(filePath), { recursive: true });

  // Salva o arquivo no disco
  await writeFile(filePath, data);

  return { key, url: `/uploads/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/uploads/${key}` };
}

// Mantido por compatibilidade — no storage local a URL pública já é direta
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/uploads/${key}`;
}
