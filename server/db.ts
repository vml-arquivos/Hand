import { and, asc, count, desc, eq, inArray, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import { 
  bilhetes, compradores, InsertRifa, InsertUser, pedidos, rifas, users, 
  adminUsers, auditLogs, premios, rifaAssets,
  type OrderStatus, type AdminUser, type InsertAdminUser, type InsertPremio
} from "../drizzle/schema";
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

// --- ADMIN AUTH & BOOTSTRAP ---

export async function bootstrapAdmin() {
  const db = requireDbSync(await getDb());
  
  // Verifica se já existe algum admin
  const [existingAdmin] = await db.select().from(adminUsers).limit(1);
  if (existingAdmin) return;

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Super Admin";

  if (!email || !password) {
    console.warn("[bootstrap] ADMIN_EMAIL ou ADMIN_PASSWORD não configurados. Pulando bootstrap.");
    return;
  }

  console.log(`[bootstrap] Criando primeiro super_admin: ${email}`);
  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(adminUsers).values({
    name,
    email,
    passwordHash,
    role: "super_admin",
    active: true,
  });
}

export async function getAdminByEmail(email: string) {
  const db = requireDbSync(await getDb());
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  return admin;
}

export async function getAdminById(id: number) {
  const db = requireDbSync(await getDb());
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return admin;
}

// --- AUDIT LOGS ---

export async function createAuditLog(input: { 
  adminUserId?: number; 
  action: string; 
  entityType?: string; 
  entityId?: number; 
  details?: any;
  ipAddress?: string;
}) {
  const db = requireDbSync(await getDb());
  await db.insert(auditLogs).values({
    adminUserId: input.adminUserId || null,
    action: input.action,
    entityType: input.entityType || null,
    entityId: input.entityId || null,
    details: input.details || null,
    ipAddress: input.ipAddress || null,
  });
}

// --- USERS (PUBLIC) ---

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

// --- RIFAS & PEDIDOS ---

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
  
  // Buscar prêmios da rifa
  const rifaPremios = await db.select().from(premios).where(and(eq(premios.rifaId, rifa.id), eq(premios.ativo, true))).orderBy(asc(premios.ordem));

  return {
    ...rifa,
    // Garante que precoBilhete seja sempre uma string numérica válida
    precoBilhete: parseFloat(String(rifa.precoBilhete)).toFixed(2),
    vendidos: Number(confirmed?.total ?? 0),
    pendentes: Number(pending?.total ?? 0),
    disponiveis: Math.max(0, rifa.totalBilhetes - Number(confirmed?.total ?? 0)),
    premios: rifaPremios,
  };
}

export async function listAllRifas() {
  const db = requireDbSync(await getDb());
  const rows = await db.select().from(rifas).orderBy(desc(rifas.createdAt));
  // Normaliza precoBilhete para sempre ser string numérica com 2 casas
  return rows.map(r => ({
    ...r,
    precoBilhete: parseFloat(String(r.precoBilhete)).toFixed(2),
  }));
}

export async function createPedido(input: { 
  rifaId: number; 
  quantidade: number; 
  nome: string; 
  telefone: string; 
  email?: string | null;
  comprovanteUrl?: string | null;
}) {
  const db = requireDbSync(await getDb());
  const [rifa] = await db.select().from(rifas).where(eq(rifas.id, input.rifaId)).limit(1);
  if (!rifa || !rifa.ativa) throw new Error("Rifa indisponível.");
  
  const [usados] = await db.select({ total: count() }).from(bilhetes).where(eq(bilhetes.rifaId, rifa.id));
  if (Number(usados?.total ?? 0) + input.quantidade > rifa.totalBilhetes) throw new Error("Não há bilhetes suficientes disponíveis.");
  
  const precoBilheteNumerico = parseFloat(String(rifa.precoBilhete));
  const valorTotal = (precoBilheteNumerico * input.quantidade).toFixed(2);
  
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
    comprovanteUrl: input.comprovanteUrl || null,
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
  return {
    ...row,
    pedido: {
      ...row.pedido,
      valorTotal: parseFloat(String(row.pedido.valorTotal)).toFixed(2),
    },
    rifa: {
      ...row.rifa,
      precoBilhete: parseFloat(String(row.rifa.precoBilhete)).toFixed(2),
    },
    bilhetes: numeros,
  };
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
  return rows.map(row => ({
    ...row,
    pedido: {
      ...row.pedido,
      valorTotal: parseFloat(String(row.pedido.valorTotal)).toFixed(2),
    },
    rifa: {
      ...row.rifa,
      precoBilhete: parseFloat(String(row.rifa.precoBilhete)).toFixed(2),
    },
    bilhetes: tickets.filter(t => t.pedidoId === row.pedido.id),
  }));
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

export async function confirmarPedido(pedidoId: number, adminUserId?: number) {
  const db = requireDbSync(await getDb());
  return await db.transaction(async (tx) => {
    const [pedido] = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId)).for("update").limit(1);
    if (!pedido) throw new Error("Pedido não encontrado.");
    if (pedido.status !== "pendente") throw new Error("Somente pedidos pendentes podem ser confirmados.");
    
    const [rifa] = await tx.select().from(rifas).where(eq(rifas.id, pedido.rifaId)).for("update").limit(1);
    if (!rifa) throw new Error("Rifa não encontrada.");
    
    const existentes = await tx.select({ numero: bilhetes.numero }).from(bilhetes).where(eq(bilhetes.rifaId, pedido.rifaId));
    const numeros = calcularNumerosDisponiveis(rifa.totalBilhetes, existentes.map(x => x.numero), pedido.quantidade);
    
    await tx.insert(bilhetes).values(numeros.map(numero => ({ 
      rifaId: pedido.rifaId, 
      pedidoId: pedido.id, 
      compradorId: pedido.compradorId, 
      numero 
    })));
    
    await tx.update(pedidos).set({ 
      status: "confirmado", 
      confirmadoEm: new Date(), 
      confirmadoPorUserId: adminUserId || null,
      updatedAt: new Date() 
    }).where(eq(pedidos.id, pedido.id));
    
    return { numeros };
  });
}

export async function cancelarPedido(pedidoId: number, adminUserId?: number) {
  const db = requireDbSync(await getDb());
  const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.status === "cancelado") return { success: true };
  
  await db.transaction(async (tx) => {
    await tx.delete(bilhetes).where(eq(bilhetes.pedidoId, pedidoId));
    await tx.update(pedidos).set({ 
      status: "cancelado", 
      canceladoEm: new Date(), 
      canceladoPorUserId: adminUserId || null,
      updatedAt: new Date() 
    }).where(eq(pedidos.id, pedidoId));
  });
  return { success: true };
}

/**
 * Busca todos os pedidos de um comprador pelo telefone (normalizado).
 * Remove todos os caracteres não numéricos antes de comparar.
 */
export async function getPedidosByTelefone(telefone: string) {
  const db = requireDbSync(await getDb());
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 8) return [];

  // Busca todos os compradores e filtra por telefone (match de sufixo)
  const compradorRows = await db.select().from(compradores);
  const matched = compradorRows.filter(c => {
    const d = c.telefone.replace(/\D/g, "");
    return d.endsWith(digits) || digits.endsWith(d);
  });
  if (!matched.length) return [];

  const ids = matched.map(c => c.id);
  const rows = await db
    .select({ pedido: pedidos, comprador: compradores, rifa: rifas })
    .from(pedidos)
    .innerJoin(compradores, eq(pedidos.compradorId, compradores.id))
    .innerJoin(rifas, eq(pedidos.rifaId, rifas.id))
    .where(inArray(pedidos.compradorId, ids))
    .orderBy(desc(pedidos.createdAt));

  const pedidoIds = rows.map(r => r.pedido.id);
  const tickets = pedidoIds.length
    ? await db.select().from(bilhetes).where(inArray(bilhetes.pedidoId, pedidoIds)).orderBy(asc(bilhetes.numero))
    : [];

  return rows.map(row => ({
    ...row,
    pedido: {
      ...row.pedido,
      valorTotal: parseFloat(String(row.pedido.valorTotal)).toFixed(2),
    },
    rifa: {
      ...row.rifa,
      precoBilhete: parseFloat(String(row.rifa.precoBilhete)).toFixed(2),
    },
    bilhetes: tickets.filter(t => t.pedidoId === row.pedido.id),
  }));
}

export async function createRifa(input: InsertRifa) {
  const db = requireDbSync(await getDb());
  const [created] = await db.insert(rifas).values({ ...input, updatedAt: new Date() }).returning();
  return { ...created, precoBilhete: parseFloat(String(created.precoBilhete)).toFixed(2) };
}

export async function updateRifa(input: InsertRifa & { id: number }) {
  const db = requireDbSync(await getDb());
  const { id, ...data } = input;
  const [updated] = await db.update(rifas).set({ ...data, updatedAt: new Date() }).where(eq(rifas.id, id)).returning();
  return { ...updated, precoBilhete: parseFloat(String(updated.precoBilhete)).toFixed(2) };
}

// --- PREMIOS ---

export async function listPremios(rifaId: number) {
  const db = requireDbSync(await getDb());
  return db.select().from(premios).where(eq(premios.rifaId, rifaId)).orderBy(asc(premios.ordem));
}

export async function upsertPremio(input: InsertPremio & { id?: number }) {
  const db = requireDbSync(await getDb());
  if (input.id) {
    const { id, ...data } = input;
    const [updated] = await db.update(premios).set({ ...data, updatedAt: new Date() }).where(eq(premios.id, id)).returning();
    return updated;
  } else {
    const [created] = await db.insert(premios).values({ ...input, updatedAt: new Date() }).returning();
    return created;
  }
}

export async function deletePremio(id: number) {
  const db = requireDbSync(await getDb());
  await db.delete(premios).where(eq(premios.id, id));
  return { success: true };
}
