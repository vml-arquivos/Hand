import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "troque_este_segredo_jwt_com_mais_de_32_caracteres");

/**
 * Sanitiza e converte o valor do preço do bilhete para número.
 * Aceita formatos: "10,00", "10.00", "R$ 10,00", "R$10.50", "10" etc.
 * Retorna NaN se o valor for inválido.
 */
function sanitizarPreco(valor: string | number): number {
  if (typeof valor === "number") return isNaN(valor) ? NaN : valor;
  const limpo = String(valor)
    .trim()
    .replace(/R\$\s*/gi, "")   // Remove "R$" com ou sem espaço
    .replace(/\s+/g, "")       // Remove espaços restantes
    .replace(/\./g, "")        // Remove pontos de milhar (ex: 1.000,00 → 100000)
    .replace(",", ".");        // Converte vírgula decimal para ponto
  return parseFloat(limpo);
}

export const appRouter = router({
  // --- AUTHENTICATION ---
  auth: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const admin = await db.getAdminByEmail(input.email);
        if (!admin || !admin.active) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas ou conta inativa." });
        }

        const valid = await bcrypt.compare(input.password, admin.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
        }

        // Gerar JWT
        const token = await new SignJWT({ sub: String(admin.id), role: admin.role })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("24h")
          .sign(JWT_SECRET);

        // Setar Cookie
        ctx.res.cookie("admin_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000, // 24h
        });

        await db.createAuditLog({ adminUserId: admin.id, action: "login", entityType: "admin_user", entityId: admin.id });

        return { success: true, user: { id: admin.id, name: admin.name, role: admin.role } };
      }),

    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.admin) return null;
      return { id: ctx.admin.id, name: ctx.admin.name, role: ctx.admin.role };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie("admin_token");
      return { success: true };
    }),
  }),

  // --- PUBLIC RIFA ROUTES ---
  rifa: router({
    list: publicProcedure.query(async () => {
      return db.listAllRifas();
    }),
    public: publicProcedure
      .input(z.object({ slug: z.string().default("rifa-beneficente") }))
      .query(async ({ input }) => {
        const rifa = await db.getPublicRifa(input.slug);
        if (!rifa) throw new TRPCError({ code: "NOT_FOUND", message: "Rifa não encontrada." });
        return rifa;
      }),
    criarPedido: publicProcedure
      .input(
        z.object({
          rifaId: z.number().int().positive(),
          quantidade: z.number().int().min(1).max(100),
          nome: z.string().min(2, "Informe o nome do comprador."),
          telefone: z.string().min(8, "Informe um WhatsApp válido."),
          email: z.string().email().optional().or(z.literal("")),
          comprovanteUrl: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          return await db.createPedido({ ...input, email: input.email || null });
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Erro ao criar pedido." });
        }
      }),
    comprovante: publicProcedure.input(z.object({ codigo: z.string().min(3) })).query(async ({ input }) => {
      const pedido = await db.getPedidoDetalhado(input.codigo);
      if (!pedido) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      return pedido;
    }),
  }),

  // --- ADMIN PROTECTED ROUTES ---
  admin: router({
    dashboard: adminProcedure.query(async () => {
      const [pedidos, stats, rifas] = await Promise.all([
        db.listPedidos(),
        db.getAdminStats(),
        db.listAllRifas()
      ]);
      return { pedidos, stats, rifas };
    }),

    // Gestão de Rifas
    salvarRifa: adminProcedure
      .input(
        z.object({
          id: z.number().int().optional(),
          slug: z.string().min(3),
          nome: z.string().min(3),
          descricao: z.string().min(10),
          premio: z.string().optional().or(z.literal("")),
          dataSorteio: z.string().optional().or(z.literal("")),
          imagemUrl: z.string().optional().or(z.literal("")),
          totalBilhetes: z.number().int().min(1),
          // Aceita string ou número — o frontend pode enviar "10.00" ou 10.00
          precoBilhete: z.union([z.string().min(1), z.number()]),
          pixChave: z.string().min(3),
          pixCopiaCola: z.string().min(10),
          ativa: z.boolean(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        // Sanitiza e valida o preço
        const precoNumerico = sanitizarPreco(input.precoBilhete);
        if (isNaN(precoNumerico) || precoNumerico < 0.01) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Preço inválido: "${input.precoBilhete}". Use o formato 10,00 ou 10.00`,
          });
        }

        // Garante que o preço seja salvo como string com 2 casas decimais
        const precoFormatado = precoNumerico.toFixed(2);

        const data = {
          ...input,
          precoBilhete: precoFormatado,
          premio: input.premio || null,
          dataSorteio: input.dataSorteio || null,
          imagemUrl: input.imagemUrl || null,
        };

        let result;
        if (input.id) {
          result = await db.updateRifa({ ...data, id: input.id });
          await db.createAuditLog({
            adminUserId: ctx.admin.id,
            action: "update_rifa",
            entityType: "rifa",
            entityId: result.id,
            details: { nome: result.nome, precoBilhete: precoFormatado },
          });
        } else {
          result = await db.createRifa(data);
          await db.createAuditLog({
            adminUserId: ctx.admin.id,
            action: "create_rifa",
            entityType: "rifa",
            entityId: result.id,
            details: { nome: result.nome, precoBilhete: precoFormatado },
          });
        }
        return result;
      }),

    // Gestão de Prêmios
    listPremios: adminProcedure.input(z.object({ rifaId: z.number() })).query(async ({ input }) => {
      return db.listPremios(input.rifaId);
    }),
    salvarPremio: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        rifaId: z.number(),
        titulo: z.string().min(2),
        descricao: z.string().optional(),
        imagemUrl: z.string().optional(),
        ordem: z.number().default(0),
        ativo: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.upsertPremio(input);
        await db.createAuditLog({
          adminUserId: ctx.admin.id,
          action: input.id ? "update_premio" : "create_premio",
          entityType: "premio",
          entityId: result.id,
          details: { titulo: result.titulo, rifaId: result.rifaId },
        });
        return result;
      }),
    removerPremio: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.deletePremio(input.id);
      await db.createAuditLog({ adminUserId: ctx.admin.id, action: "delete_premio", entityType: "premio", entityId: input.id });
      return { success: true };
    }),

    // Gestão de Pedidos
    confirmarPedido: adminProcedure.input(z.object({ pedidoId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const result = await db.confirmarPedido(input.pedidoId, ctx.admin.id);
      await db.createAuditLog({ adminUserId: ctx.admin.id, action: "confirm_order", entityType: "pedido", entityId: input.pedidoId });
      return result;
    }),
    cancelarPedido: adminProcedure.input(z.object({ pedidoId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const result = await db.cancelarPedido(input.pedidoId, ctx.admin.id);
      await db.createAuditLog({ adminUserId: ctx.admin.id, action: "cancel_order", entityType: "pedido", entityId: input.pedidoId });
      return result;
    }),

    // Upload de Imagens
    uploadImagem: adminProcedure
      .input(z.object({
        fileName: z.string().min(1),
        contentType: z.string().startsWith("image/"),
        base64: z.string().min(20),
        assetType: z.enum(["rifa_main", "premio", "comprovante"]),
        rifaId: z.number().optional(),
        premioId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.base64, "base64");
        if (buffer.length > 8 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Imagem muito grande (máx 8MB)." });
        }

        // Sanitiza o nome do arquivo: mantém apenas caracteres seguros
        const safeName = input.fileName
          .replace(/[^a-zA-Z0-9._-]/g, "-")
          .replace(/-+/g, "-")
          .toLowerCase();

        const folder = input.assetType === "comprovante" ? "comprovantes" : "rifas";
        const result = await storagePut(`${folder}/${Date.now()}-${safeName}`, buffer, input.contentType);

        await db.createAuditLog({
          adminUserId: ctx.admin.id,
          action: "upload_image",
          entityType: input.assetType,
          details: { url: result.url, type: input.assetType },
        });

        return { url: result.url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
