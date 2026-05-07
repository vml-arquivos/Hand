import { relations } from "drizzle-orm";
import { boolean, decimal, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const orderStatusEnum = pgEnum("order_status", ["pendente", "confirmado", "cancelado"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { mode: "date" }).defaultNow().notNull(),
});

export const rifas = pgTable("rifas", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  nome: varchar("nome", { length: 180 }).notNull(),
  descricao: text("descricao").notNull(),
  premio: varchar("premio", { length: 255 }),
  dataSorteio: varchar("dataSorteio", { length: 120 }),
  imagemUrl: text("imagemUrl"),
  totalBilhetes: integer("totalBilhetes").notNull(),
  precoBilhete: decimal("precoBilhete", { precision: 10, scale: 2 }).notNull().$type<string>(),
  pixChave: varchar("pixChave", { length: 255 }).notNull(),
  pixCopiaCola: text("pixCopiaCola").notNull(),
  ativa: boolean("ativa").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const compradores = pgTable("compradores", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 180 }).notNull(),
  telefone: varchar("telefone", { length: 40 }).notNull(),
  email: varchar("email", { length: 320 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const pedidos = pgTable("pedidos", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 32 }).notNull().unique(),
  rifaId: integer("rifaId").notNull().references(() => rifas.id),
  compradorId: integer("compradorId").notNull().references(() => compradores.id),
  quantidade: integer("quantidade").notNull(),
  valorTotal: decimal("valorTotal", { precision: 10, scale: 2 }).notNull().$type<string>(),
  status: orderStatusEnum("status").default("pendente").notNull(),
  confirmadoEm: timestamp("confirmadoEm", { mode: "date" }),
  canceladoEm: timestamp("canceladoEm", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const bilhetes = pgTable("bilhetes", {
  id: serial("id").primaryKey(),
  rifaId: integer("rifaId").notNull().references(() => rifas.id),
  pedidoId: integer("pedidoId").notNull().references(() => pedidos.id),
  compradorId: integer("compradorId").notNull().references(() => compradores.id),
  numero: integer("numero").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  rifaNumeroUnique: uniqueIndex("bilhetes_rifa_numero_unique").on(table.rifaId, table.numero),
}));

export const rifasRelations = relations(rifas, ({ many }) => ({ pedidos: many(pedidos), bilhetes: many(bilhetes) }));
export const compradoresRelations = relations(compradores, ({ many }) => ({ pedidos: many(pedidos), bilhetes: many(bilhetes) }));
export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  rifa: one(rifas, { fields: [pedidos.rifaId], references: [rifas.id] }),
  comprador: one(compradores, { fields: [pedidos.compradorId], references: [compradores.id] }),
  bilhetes: many(bilhetes),
}));
export const bilhetesRelations = relations(bilhetes, ({ one }) => ({
  rifa: one(rifas, { fields: [bilhetes.rifaId], references: [rifas.id] }),
  pedido: one(pedidos, { fields: [bilhetes.pedidoId], references: [pedidos.id] }),
  comprador: one(compradores, { fields: [bilhetes.compradorId], references: [compradores.id] }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Rifa = typeof rifas.$inferSelect;
export type InsertRifa = typeof rifas.$inferInsert;
export type Comprador = typeof compradores.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
export type Bilhete = typeof bilhetes.$inferSelect;
export type OrderStatus = "pendente" | "confirmado" | "cancelado";
