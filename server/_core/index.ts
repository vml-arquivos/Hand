import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { resolve } from "path";
import { bootstrapAdmin } from "../db";

const UPLOADS_DIR = process.env.UPLOAD_DIR
  ? resolve(process.env.UPLOAD_DIR)
  : resolve(process.cwd(), "uploads");

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Bootstrap Admin User
  await bootstrapAdmin().catch(err => console.error("[bootstrap] Erro ao criar admin inicial:", err));

  const app = express();
  const server = createServer(app);

  app.use(cookieParser());
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Serve uploaded files from /uploads directory
  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "1d" }));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ── Open Graph dinâmico por slug ──────────────────────────────────────────────
  // TODOS os acessos a /rifa/:slug recebem HTML com meta tags OG injetadas.
  // Isso garante que WhatsApp, Telegram e outros crawlers sempre vejam a imagem.
  // Para usuários normais: o SPA é carregado normalmente via o index.html com
  // as meta tags já presentes no <head>.
  app.get("/rifa/:slug", async (req, res, next) => {
    try {
      const { getPublicRifa } = await import("../db");
      const rifa = await getPublicRifa(req.params.slug);
      if (!rifa) return next();

      // Determina a URL base do site (usa PUBLIC_URL se definido, senão detecta do request)
      // Força HTTPS se PUBLIC_URL não estiver definido mas o request vier de proxy HTTPS
      const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
      const siteUrl = (process.env.PUBLIC_URL ?? `${proto}://${req.get("host")}`).replace(/\/$/, "");

      // Converte URL relativa para absoluta (WhatsApp exige URL absoluta HTTPS)
      const toAbsolute = (url: string | null | undefined): string => {
        if (!url) return `${siteUrl}/og-default.png`;
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        return `${siteUrl}${url.startsWith("/") ? url : "/" + url}`;
      };

      // Usa thumbnailUrl como imagem OG, com fallback para imagemUrl
      const thumb = toAbsolute(rifa.thumbnailUrl || rifa.imagemUrl);
      const descricao = (rifa.descricao ?? "").slice(0, 200)
        .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const titulo = (rifa.nome ?? "")
        .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const preco = parseFloat(String(rifa.precoBilhete)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const rifaUrl = `${siteUrl}/rifa/${rifa.slug}`;

      // Meta tags OG completas — compatíveis com WhatsApp, Telegram, Facebook, Twitter
      const ogMeta = `
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${rifaUrl}" />
  <meta property="og:title" content="${titulo}" />
  <meta property="og:description" content="Bilhete por ${preco}. ${descricao}" />
  <meta property="og:image" content="${thumb}" />
  <meta property="og:image:secure_url" content="${thumb}" />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:image:alt" content="${titulo}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="Rifas Beneficentes" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${titulo}" />
  <meta name="twitter:description" content="Bilhete por ${preco}. ${descricao}" />
  <meta name="twitter:image" content="${thumb}" />`;

      // Em produção: injeta as meta tags no index.html do SPA
      // Assim usuários normais carregam o SPA normalmente E os bots veem as meta tags
      let html: string | null = null;
      if (process.env.NODE_ENV === "production") {
        try {
          const { readFileSync } = await import("fs");
          const { resolve: resolvePath } = await import("path");
          const spaPath = resolvePath(process.cwd(), "dist", "public", "index.html");
          let spaHtml = readFileSync(spaPath, "utf-8");
          // Remove title padrão e injeta o título e meta tags OG da rifa
          spaHtml = spaHtml.replace(
            /<title>[^<]*<\/title>/,
            `<title>${titulo} — Rifas Beneficentes</title>\n  <meta name="description" content="${descricao}" />${ogMeta}`
          );
          html = spaHtml;
        } catch {
          // fallback: HTML mínimo com OG
        }
      }

      // Fallback: HTML mínimo com OG + redirect (usado em dev ou se SPA não disponível)
      if (!html) {
        html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${titulo} — Rifas Beneficentes</title>
  <meta name="description" content="${descricao}" />
  ${ogMeta}
  <meta http-equiv="refresh" content="0; url=${rifaUrl}" />
</head>
<body>
  <p>Participar da rifa: <a href="${rifaUrl}">${titulo}</a></p>
  <img src="${thumb}" alt="${titulo}" style="max-width:400px" />
</body>
</html>`;
      }

      res.status(200)
        .set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache, no-store" })
        .end(html);
    } catch {
      next();
    }
  });

  // Fallback routes for SPA (must come after /uploads and other static routes)
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
