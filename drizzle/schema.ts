import { relations } from "drizzle-orm";
import { boolean, decimal, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar, jsonb } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const orderStatusEnum = pgEnum("order_status", ["pendente", "confirmado", "cancelado"]);
export const adminRoleEnum = pgEnum("admin_role", ["super_admin", "admin", "operador"]);

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

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).default("admin").notNull(), // super_admin, admin, operador
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
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

export const premios = pgTable("premios", {
  id: serial("id").primaryKey(),
  rifaId: integer("rifa_id").notNull().references(() => rifas.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  imagemUrl: text("imagem_url"),
  ordem: integer("ordem").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
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
  comprovanteUrl: text("comprovante_url"),
  observacaoAdmin: text("observacao_admin"),
  confirmadoPorUserId: integer("confirmado_por_user_id").references(() => adminUsers.id),
  canceladoPorUserId: integer("cancelado_por_user_id").references(() => adminUsers.id),
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

export const rifaAssets = pgTable("rifa_assets", {
  id: serial("id").primaryKey(),
  rifaId: integer("rifa_id").references(() => rifas.id, { onDelete: "set null" }),
  premioId: integer("premio_id").references(() => premios.id, { onDelete: "set null" }),
  assetType: varchar("asset_type", { length: 50 }).notNull(), // 'rifa_main', 'premio', 'comprovante'
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  contentType: varchar("content_type", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }), // 'rifa', 'pedido', 'premio', 'admin_user'
  entityId: integer("entity_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// Relations
export const rifasRelations = relations(rifas, ({ many }) => ({ 
  pedidos: many(pedidos), 
  bilhetes: many(bilhetes),
  premios: many(premios),
  assets: many(rifaAssets)
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  confirmacoes: many(pedidos, { relationName: "confirmadoPor" }),
  cancelamentos: many(pedidos, { relationName: "canceladoPor" }),
  logs: many(auditLogs)
}));

export const premiosRelations = relations(premios, ({ one, many }) => ({
  rifa: one(rifas, { fields: [premios.rifaId], references: [rifas.id] }),
  assets: many(rifaAssets)
}));

export const compradoresRelations = relations(compradores, ({ many }) => ({ 
  pedidos: many(pedidos), 
  bilhetes: many(bilhetes) 
}));

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  rifa: one(rifas, { fields: [pedidos.rifaId], references: [rifas.id] }),
  comprador: one(compradores, { fields: [pedidos.compradorId], references: [compradores.id] }),
  confirmadoPor: one(adminUsers, { fields: [pedidos.confirmadoPorUserId], references: [adminUsers.id], relationName: "confirmadoPor" }),
  canceladoPor: one(adminUsers, { fields: [pedidos.canceladoPorUserId], references: [adminUsers.id], relationName: "canceladoPor" }),
  bilhetes: many(bilhetes),
}));

export const bilhetesRelations = relations(bilhetes, ({ one }) => ({
  rifa: one(rifas, { fields: [bilhetes.rifaId], references: [rifas.id] }),
  pedido: one(pedidos, { fields: [bilhetes.pedidoId], references: [pedidos.id] }),
  comprador: one(compradores, { fields: [bilhetes.compradorId], references: [compradores.id] }),
}));

export const rifaAssetsRelations = relations(rifaAssets, ({ one }) => ({
  rifa: one(rifas, { fields: [rifaAssets.rifaId], references: [rifas.id] }),
  premio: one(premios, { fields: [rifaAssets.premioId], references: [premios.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  adminUser: one(adminUsers, { fields: [auditLogs.adminUserId], references: [adminUsers.id] }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type Rifa = typeof rifas.$inferSelect;
export type InsertRifa = typeof rifas.$inferInsert;
export type Premio = typeof premios.$inferSelect;
export type InsertPremio = typeof premios.$inferInsert;
export type Comprador = typeof compradores.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
export type Bilhete = typeof bilhetes.$inferSelect;
export type RifaAsset = typeof rifaAssets.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type OrderStatus = "pendente" | "confirmado" | "cancelado";
export type AdminRole = "super_admin" | "admin" | "operador";
