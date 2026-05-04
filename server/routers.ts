import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const adminSecret = z.object({ adminSecret: z.string().min(1) });
function assertAdmin(secret: string) {
  const expected = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "admin123";
  if (secret !== expected) throw new TRPCError({ code: "FORBIDDEN", message: "Senha administrativa inválida." });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  rifa: router({
    public: publicProcedure.input(z.object({ slug: z.string().default("rifa-beneficente") })).query(async ({ input }) => {
      const rifa = await db.getPublicRifa(input.slug);
      if (!rifa) throw new TRPCError({ code: "NOT_FOUND", message: "Rifa não encontrada." });
      return rifa;
    }),
    criarPedido: publicProcedure.input(z.object({
      rifaId: z.number().int().positive(),
      quantidade: z.number().int().min(1).max(100),
      nome: z.string().min(2, "Informe o nome do comprador."),
      telefone: z.string().min(8, "Informe um WhatsApp válido."),
      email: z.string().email().optional().or(z.literal("")),
    })).mutation(async ({ input }) => {
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
  admin: router({
    dashboard: publicProcedure.input(adminSecret).query(async ({ input }) => {
      assertAdmin(input.adminSecret);
      const [pedidos, stats, rifa] = await Promise.all([db.listPedidos(), db.getAdminStats(), db.getPublicRifa()]);
      return { pedidos, stats, rifa };
    }),
    confirmarPedido: publicProcedure.input(adminSecret.extend({ pedidoId: z.number().int().positive() })).mutation(async ({ input }) => {
      assertAdmin(input.adminSecret);
      try { return await db.confirmarPedido(input.pedidoId); }
      catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Erro ao confirmar pedido." }); }
    }),
    cancelarPedido: publicProcedure.input(adminSecret.extend({ pedidoId: z.number().int().positive() })).mutation(async ({ input }) => {
      assertAdmin(input.adminSecret);
      try { return await db.cancelarPedido(input.pedidoId); }
      catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Erro ao cancelar pedido." }); }
    }),
    salvarRifa: publicProcedure.input(adminSecret.extend({
      id: z.number().int().positive(),
      slug: z.string().min(3),
      nome: z.string().min(3),
      descricao: z.string().min(10),
      imagemUrl: z.string().url().optional().or(z.literal("")),
      totalBilhetes: z.number().int().min(1),
      precoBilhete: z.string().min(1),
      pixChave: z.string().min(3),
      pixCopiaCola: z.string().min(10),
      ativa: z.boolean(),
    })).mutation(async ({ input }) => {
      assertAdmin(input.adminSecret);
      const { adminSecret: _, ...rifa } = input;
      return db.updateRifa({ ...rifa, imagemUrl: rifa.imagemUrl || null });
    }),
  }),
});

export type AppRouter = typeof appRouter;
