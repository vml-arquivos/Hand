// Storage local — salva arquivos no disco do servidor em /app/uploads
// Servido via rota estática /uploads/* pelo Express (index.ts)
// Não requer nenhuma variável de ambiente ou serviço externo.
//
// Em produção com proxy reverso (Nginx/Traefik/Qualify), a URL relativa
// /uploads/... é resolvida corretamente pelo navegador pois o proxy
// encaminha todas as rotas para o mesmo servidor Express.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Diretório de uploads: /app/uploads (persistido via volume Docker)
// Em desenvolvimento: <raiz do projeto>/uploads
const UPLOADS_DIR = process.env.UPLOAD_DIR
  ? resolve(process.env.UPLOAD_DIR)
  : resolve(process.cwd(), "uploads");

// Base URL pública para as imagens (sem barra final)
// Em produção com proxy reverso, manter como "/uploads" (relativo)
// Se precisar de URL absoluta, configure PUBLIC_UPLOAD_BASE_URL=https://seudominio.com/uploads
const PUBLIC_BASE = (process.env.PUBLIC_UPLOAD_BASE_URL ?? "/uploads").replace(/\/$/, "");

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  // Usa crypto.randomUUID() disponível globalmente no Node.js 18+
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

  // Retorna URL pública — relativa por padrão, absoluta se PUBLIC_UPLOAD_BASE_URL configurado
  const url = `${PUBLIC_BASE}/${key}`;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `${PUBLIC_BASE}/${key}` };
}

// Mantido por compatibilidade — no storage local a URL pública já é direta
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `${PUBLIC_BASE}/${key}`;
}
