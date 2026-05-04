import { and, asc, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { bilhetes, compradores, InsertRifa, InsertUser, pedidos, rifas, users, type OrderStatus } from "../drizzle/schema";
import { ENV } from "./_core/env";

const { Pool } = pg;
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(_pool);
  }
  return _db;
}

function requireDbSync(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("DATABASE_URL não configurada. Configure PostgreSQL antes de usar o sistema.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  await db.insert(users).values({
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role,
      lastSignedIn: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export function gerarCodigoPedido() {
  return `RF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function calcularNumerosDisponiveis(totalBilhetes: number, numerosUsados: number[], quantidade: number) {
  const usados = new Set(numerosUsados);
  const selecionados: number[] = [];
  for (let numero = 1; numero <= totalBilhetes && selecionados.length < quantidade; numero += 1) {
    if (!usados.has(numero)) selecionados.push(numero);
  }
  if (selecionados.length < quantidade) throw new Error("Quantidade de bilhetes indisponível para esta rifa.");
  return selecionados;
}

export async function getPublicRifa(slug = "rifa-beneficente") {
  const db = requireDbSync(await getDb());
  const [rifa] = await db.select().from(rifas).where(eq(rifas.slug, slug)).limit(1);
  if (!rifa) return null;
  const [confirmed] = await db.select({ total: count() }).from(bilhetes).where(eq(bilhetes.rifaId, rifa.id));
  const [pending] = await db.select({ total: sum(pedidos.quantidade) }).from(pedidos).where(and(eq(pedidos.rifaId, rifa.id), eq(pedidos.status, "pendente")));
  return {
    ...rifa,
    vendidos: Number(confirmed?.total ?? 0),
    pendentes: Number(pending?.total ?? 0),
    disponiveis: Math.max(0, rifa.totalBilhetes - Number(confirmed?.total ?? 0)),
  };
}

export async function createPedido(input: { rifaId: number; quantidade: number; nome: string; telefone: string; email?: string | null }) {
  const db = requireDbSync(await getDb());
  const [rifa] = await db.select().from(rifas).where(eq(rifas.id, input.rifaId)).limit(1);
  if (!rifa || !rifa.ativa) throw new Error("Rifa indisponível.");
  const [usados] = await db.select({ total: count() }).from(bilhetes).where(eq(bilhetes.rifaId, rifa.id));
  if (Number(usados?.total ?? 0) + input.quantidade > rifa.totalBilhetes) throw new Error("Não há bilhetes suficientes disponíveis.");
  const valorTotal = (Number(rifa.precoBilhete) * input.quantidade).toFixed(2);
  const [comprador] = await db.insert(compradores).values({
    nome: input.nome.trim(),
    telefone: input.telefone.trim(),
    email: input.email?.trim() || null,
    updatedAt: new Date(),
  }).returning();
  const [pedido] = await db.insert(pedidos).values({
    codigo: gerarCodigoPedido(),
    rifaId: rifa.id,
    compradorId: comprador.id,
    quantidade: input.quantidade,
    valorTotal,
    status: "pendente",
    updatedAt: new Date(),
  }).returning();
  return getPedidoDetalhado(pedido.codigo);
}

export async function getPedidoDetalhado(codigo: string) {
  const db = requireDbSync(await getDb());
  const rows = await db.select({ pedido: pedidos, comprador: compradores, rifa: rifas })
    .from(pedidos)
    .innerJoin(compradores, eq(pedidos.compradorId, compradores.id))
    .innerJoin(rifas, eq(pedidos.rifaId, rifas.id))
    .where(eq(pedidos.codigo, codigo))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const numeros = await db.select().from(bilhetes).where(eq(bilhetes.pedidoId, row.pedido.id)).orderBy(asc(bilhetes.numero));
  return { ...row, bilhetes: numeros };
}

export async function listPedidos() {
  const db = requireDbSync(await getDb());
  const rows = await db.select({ pedido: pedidos, comprador: compradores, rifa: rifas })
    .from(pedidos)
    .innerJoin(compradores, eq(pedidos.compradorId, compradores.id))
    .innerJoin(rifas, eq(pedidos.rifaId, rifas.id))
    .orderBy(desc(pedidos.createdAt));
  const pedidoIds = rows.map(r => r.pedido.id);
  const tickets = pedidoIds.length ? await db.select().from(bilhetes).where(inArray(bilhetes.pedidoId, pedidoIds)).orderBy(asc(bilhetes.numero)) : [];
  return rows.map(row => ({ ...row, bilhetes: tickets.filter(t => t.pedidoId === row.pedido.id) }));
}

export async function getAdminStats() {
  const db = requireDbSync(await getDb());
  const rows = await db.select({ status: pedidos.status, quantidade: sum(pedidos.quantidade), valor: sum(pedidos.valorTotal) }).from(pedidos).groupBy(pedidos.status);
  const vendidos = await db.select({ total: count() }).from(bilhetes);
  return {
    pendente: rows.find(r => r.status === "pendente") ?? { status: "pendente" as OrderStatus, quantidade: "0", valor: "0" },
    confirmado: rows.find(r => r.status === "confirmado") ?? { status: "confirmado" as OrderStatus, quantidade: "0", valor: "0" },
    cancelado: rows.find(r => r.status === "cancelado") ?? { status: "cancelado" as OrderStatus, quantidade: "0", valor: "0" },
    bilhetesConfirmados: Number(vendidos[0]?.total ?? 0),
  };
}

export async function confirmarPedido(pedidoId: number) {
  const db = requireDbSync(await getDb());
  return await db.transaction(async (tx) => {
    const [pedido] = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId)).for("update").limit(1);
    if (!pedido) throw new Error("Pedido não encontrado.");
    if (pedido.status !== "pendente") throw new Error("Somente pedidos pendentes podem ser confirmados.");
    const [rifa] = await tx.select().from(rifas).where(eq(rifas.id, pedido.rifaId)).for("update").limit(1);
    if (!rifa) throw new Error("Rifa não encontrada.");
    const existentes = await tx.select({ numero: bilhetes.numero }).from(bilhetes).where(eq(bilhetes.rifaId, pedido.rifaId));
    const numeros = calcularNumerosDisponiveis(rifa.totalBilhetes, existentes.map(x => x.numero), pedido.quantidade);
    await tx.insert(bilhetes).values(numeros.map(numero => ({ rifaId: pedido.rifaId, pedidoId: pedido.id, compradorId: pedido.compradorId, numero })));
    await tx.update(pedidos).set({ status: "confirmado", confirmadoEm: new Date(), updatedAt: new Date() }).where(eq(pedidos.id, pedido.id));
    return { numeros };
  });
}

export async function cancelarPedido(pedidoId: number) {
  const db = requireDbSync(await getDb());
  const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.status === "cancelado") return { success: true };
  await db.transaction(async (tx) => {
    await tx.delete(bilhetes).where(eq(bilhetes.pedidoId, pedidoId));
    await tx.update(pedidos).set({ status: "cancelado", canceladoEm: new Date(), updatedAt: new Date() }).where(eq(pedidos.id, pedidoId));
  });
  return { success: true };
}

export async function updateRifa(input: InsertRifa & { id: number }) {
  const db = requireDbSync(await getDb());
  const { id, ...data } = input;
  const [updated] = await db.update(rifas).set({ ...data, updatedAt: new Date() }).where(eq(rifas.id, id)).returning();
  return updated;
}
