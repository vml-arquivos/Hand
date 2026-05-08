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
  // ── Open Graph dinâmico por slug ──────────────────────────────────────
  // Bots de preview (WhatsApp, Telegram, Google) recebem HTML com meta tags OG.
  // Usuários normais passam para o SPA.
  app.get("/rifa/:slug", async (req, res, next) => {
    const ua = req.headers["user-agent"] ?? "";
    const isBot = /facebookexternalhit|twitterbot|whatsapp|telegram|linkedinbot|slackbot|discordbot|googlebot|bingbot|applebot|curl|wget|python|axios|node-fetch/i.test(ua);
    if (!isBot) return next();
    try {
      const { getPublicRifa } = await import("../db");
      const rifa = await getPublicRifa(req.params.slug);
      if (!rifa) return next();
      const siteUrl = (process.env.PUBLIC_URL ?? `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
      const thumb = rifa.thumbnailUrl
        ? (rifa.thumbnailUrl.startsWith("http") ? rifa.thumbnailUrl : `${siteUrl}${rifa.thumbnailUrl}`)
        : (rifa.imagemUrl
          ? (rifa.imagemUrl.startsWith("http") ? rifa.imagemUrl : `${siteUrl}${rifa.imagemUrl}`)
          : `${siteUrl}/og-default.png`);
      const descricao = (rifa.descricao ?? "").slice(0, 200).replace(/"/g, "&quot;");
      const preco = parseFloat(String(rifa.precoBilhete)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${rifa.nome} — Rifas Beneficentes</title>
  <meta name="description" content="${descricao}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${siteUrl}/rifa/${rifa.slug}" />
  <meta property="og:title" content="${rifa.nome}" />
  <meta property="og:description" content="Bilhete por ${preco}. ${descricao}" />
  <meta property="og:image" content="${thumb}" />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="1920" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="Rifas Beneficentes" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${rifa.nome}" />
  <meta name="twitter:description" content="Bilhete por ${preco}. ${descricao}" />
  <meta name="twitter:image" content="${thumb}" />
  <meta http-equiv="refresh" content="0; url=${siteUrl}/rifa/${rifa.slug}" />
</head>
<body><p>Redirecionando para <a href="${siteUrl}/rifa/${rifa.slug}">${rifa.nome}</a>...</p></body>
</html>`;
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
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
