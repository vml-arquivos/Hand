import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { gerarPixCopiaCola } from "./pix";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("ERRO CRÍTICO: JWT_SECRET não configurado ou muito curto (mínimo 32 caracteres).");
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET deve ser configurado em produção.");
  }
}

/**
 * Sanitiza e converte o valor do preço do bilhete para número.
 * Aceita formatos: "10,00", "10.00", "R$ 10,00", "R$10.50", "1.000,00", "10" etc.
 * Retorna NaN se o valor for inválido.
 *
 * CORREÇÃO: detecta se o valor usa vírgula como decimal (pt-BR) ou ponto como decimal (en-US)
 * antes de remover separadores de milhar, evitando que "2000.00" vire 200000.
 */
function sanitizarPreco(valor: string | number): number {
  if (typeof valor === "number") return isNaN(valor) ? NaN : valor;

  const limpo = String(valor)
    .trim()
    .replace(/R\$\s*/gi, "")
    .replace(/\s+/g, "");

  // Formato pt-BR: usa ponto como milhar e vírgula como decimal → "1.000,50"
  // Formato en-US: usa vírgula como milhar e ponto como decimal → "1,000.50"
  // Formato simples: apenas número → "10.00" ou "10,00"

  if (/\d\.\d{3},\d{2}$/.test(limpo)) {
    // pt-BR com milhar: "1.000,50" → remove pontos de milhar, troca vírgula por ponto
    return parseFloat(limpo.replace(/\./g, "").replace(",", "."));
  }

  if (/\d,\d{3}\.\d{2}$/.test(limpo)) {
    // en-US com milhar: "1,000.50" → remove vírgulas de milhar
    return parseFloat(limpo.replace(/,/g, ""));
  }

  if (/,/.test(limpo) && !/\./.test(limpo)) {
    // Só vírgula, sem ponto: "10,50" → decimal pt-BR
    return parseFloat(limpo.replace(",", "."));
  }

  // Só ponto ou sem separador: "10.50", "1000", "10.00" → já é válido
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

        const token = await new SignJWT({ sub: String(admin.id), role: admin.role })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("24h")
          .sign(JWT_SECRET);

        ctx.res.cookie("admin_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000,
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
          vendedorCodigo: z.string().optional().or(z.literal("")),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          return await db.createPedido({ ...input, email: input.email || null, vendedorCodigo: input.vendedorCodigo || null });
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Erro ao criar pedido." });
        }
      }),
    comprovante: publicProcedure.input(z.object({ codigo: z.string().min(3) })).query(async ({ input }) => {
      const pedido = await db.getPedidoDetalhado(input.codigo);
      if (!pedido) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      return pedido;
    }),

    // Busca pedidos pelo telefone do comprador (sem login)
    meusBilhetes: publicProcedure
      .input(z.object({ telefone: z.string().min(8) }))
      .query(async ({ input }) => {
        const resultados = await db.getPedidosByTelefone(input.telefone);
        return resultados;
      }),

    // Busca dados do vendedor pelo código (usado na página pública para exibir banner do aluno)
    getVendedorByCodigo: publicProcedure
      .input(z.object({ rifaId: z.number(), codigo: z.string() }))
      .query(async ({ input }) => {
        return db.getVendedorByCodigo(input.rifaId, input.codigo);
      }),
  }),

  // --- ADMIN PROTECTED ROUTES ---
  admin: router({
    dashboard: adminProcedure.query(async ({ ctx }) => {
      const adminId = ctx.admin.id;
      const role = ctx.admin.role;
      const [pedidos, stats, rifas] = await Promise.all([
        db.listPedidosByOwner(adminId, role),
        db.getAdminStatsByOwner(adminId, role),
        db.listRifasByOwner(adminId, role),
      ]);
      return { pedidos, stats, rifas };
    }),

    // Lista completa de bilhetes confirmados para controle do sorteio
    listBilhetes: adminProcedure
      .input(z.object({ rifaId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return db.listBilhetesCompleto(input.rifaId);
      }),

    // Geração automática de Pix Copia e Cola estático (sem expiração)
    gerarPix: adminProcedure
      .input(z.object({
        pixChave: z.string().min(3),
        nomeRecebedor: z.string().min(2),
        cidade: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const resultado = gerarPixCopiaCola({
            chave: input.pixChave,
            nomeRecebedor: input.nomeRecebedor,
            cidade: input.cidade || "Brasil",
            transactionId: "RIFA",
          });
          return resultado;
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não foi possível gerar o Pix para esta chave. Verifique o formato.",
          });
        }
      }),

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
          thumbnailUrl: z.string().optional().or(z.literal("")),
          totalBilhetes: z.number().int().min(1),
          // Aceita string ou número — o frontend pode enviar "10,00" ou 10.00
          precoBilhete: z.union([z.string().min(1), z.number()]),
          pixChave: z.string().min(3),
          pixCopiaCola: z.string().min(10),
          nomeRecebedor: z.string().optional().or(z.literal("")),
          cidadeRecebedor: z.string().optional().or(z.literal("")),
          ativa: z.boolean(),
          rastreamentoVendedores: z.boolean().default(false),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const precoNumerico = sanitizarPreco(input.precoBilhete);
        if (isNaN(precoNumerico) || precoNumerico < 0.01) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Preço inválido: "${input.precoBilhete}". Use o formato 10,00 ou 10.00`,
          });
        }

        const precoFormatado = precoNumerico.toFixed(2);

        const data = {
          ...input,
          precoBilhete: precoFormatado,
          premio: input.premio || null,
          dataSorteio: input.dataSorteio || null,
          imagemUrl: input.imagemUrl || null,
          thumbnailUrl: input.thumbnailUrl || null,
          nomeRecebedor: input.nomeRecebedor || null,
          cidadeRecebedor: input.cidadeRecebedor || null,
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
          // Ao criar nova rifa, vincula automaticamente ao admin logado
          result = await db.createRifa({ ...data, ownerAdminId: ctx.admin.id });
          await db.createAuditLog({
            adminUserId: ctx.admin.id,
            action: "create_rifa",
            entityType: "rifa",
            entityId: result.id,
            details: { nome: result.nome, slug: result.slug, precoBilhete: precoFormatado },
          });
        }
        return result;
      }),

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

    // --- VENDEDORES (ALUNOS) ---
    listVendedores: adminProcedure.input(z.object({ rifaId: z.number() })).query(async ({ input }) => {
      return db.listVendedores(input.rifaId);
    }),
    importarVendedores: adminProcedure
      .input(z.object({
        rifaId: z.number(),
        vendedores: z.array(z.object({ 
          nome: z.string(), 
          professor: z.string().optional(),
          turma: z.string().optional(),
          codigo: z.string() 
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.upsertVendedores(input.rifaId, input.vendedores);
        await db.createAuditLog({
          adminUserId: ctx.admin.id,
          action: "import_vendedores",
          entityType: "rifa",
          entityId: input.rifaId,
          details: { count: result.length },
        });
        return result;
      }),
    rankingVendedores: adminProcedure.input(z.object({ rifaId: z.number() })).query(async ({ input }) => {
      return db.getRankingVendedores(input.rifaId);
    }),
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

    // Apaga bilhetes e pedidos de uma rifa (apenas pendentes ou todos os de teste)
    limparBilhetesTeste: adminProcedure
      .input(z.object({
        rifaId: z.number().int().positive(),
        apenasStatus: z.enum(["pendente", "todos"]).default("pendente"),
      }))
      .mutation(async ({ input, ctx }) => {
        const total = await db.limparBilhetesTeste(input.rifaId, input.apenasStatus, ctx.admin.id);
        await db.createAuditLog({
          adminUserId: ctx.admin.id,
          action: "limpar_bilhetes_teste",
          entityType: "rifa",
          entityId: input.rifaId,
          details: { apenasStatus: input.apenasStatus, pedidosRemovidos: total },
        });
        return { pedidosRemovidos: total };
      }),

    salvarRifaComOwner: adminProcedure
      .input(z.object({ rifaId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        // Vincula uma rifa existente ao admin logado (usado ao criar nova rifa)
        await db.updateRifa({ id: input.rifaId, ownerAdminId: ctx.admin.id } as any);
        return { success: true };
      }),

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

    // --- GESTÃO DE USUÁRIOS (apenas super_admin) ---
    listUsuarios: adminProcedure.query(async ({ ctx }) => {
      if (ctx.admin.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o super administrador pode gerenciar usuários." });
      }
      return db.listAdminUsers();
    }),

    criarUsuario: adminProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["admin", "operador"]).default("admin"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.admin.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o super administrador pode criar usuários." });
        }
        try {
          const user = await db.createAdminUser(input);
          await db.createAuditLog({
            adminUserId: ctx.admin.id,
            action: "create_admin_user",
            entityType: "admin_user",
            entityId: user.id,
            details: { email: user.email, role: user.role },
          });
          return user;
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Erro ao criar usuário." });
        }
      }),

    toggleUsuario: adminProcedure
      .input(z.object({ id: z.number().int().positive(), active: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.admin.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o super administrador pode ativar/desativar usuários." });
        }
        if (input.id === ctx.admin.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode desativar sua própria conta." });
        }
        await db.toggleAdminUser(input.id, input.active);
        await db.createAuditLog({
          adminUserId: ctx.admin.id,
          action: input.active ? "activate_admin_user" : "deactivate_admin_user",
          entityType: "admin_user",
          entityId: input.id,
        });
        return { success: true };
      }),

    redefinirSenha: adminProcedure
      .input(z.object({ id: z.number().int().positive(), newPassword: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.admin.role !== "super_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o super administrador pode redefinir senhas." });
        }
        await db.resetAdminPassword(input.id, input.newPassword);
        await db.createAuditLog({
          adminUserId: ctx.admin.id,
          action: "reset_admin_password",
          entityType: "admin_user",
          entityId: input.id,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
