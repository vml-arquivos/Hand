import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("migração inicial PostgreSQL", () => {
  const migrationSql = readFileSync(resolve(process.cwd(), "drizzle/0001_rifas_postgres.sql"), "utf8");

  it("não usa CREATE TYPE IF NOT EXISTS, sintaxe inválida para enums no PostgreSQL", () => {
    expect(migrationSql).not.toMatch(/CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS/i);
  });

  it("cria os enums necessários antes das tabelas que dependem deles", () => {
    const userRoleIndex = migrationSql.indexOf('CREATE TYPE "user_role"');
    const orderStatusIndex = migrationSql.indexOf('CREATE TYPE "order_status"');
    const usersTableIndex = migrationSql.indexOf('CREATE TABLE IF NOT EXISTS "users"');
    const pedidosTableIndex = migrationSql.indexOf('CREATE TABLE IF NOT EXISTS "pedidos"');

    expect(userRoleIndex).toBeGreaterThanOrEqual(0);
    expect(orderStatusIndex).toBeGreaterThanOrEqual(0);
    expect(userRoleIndex).toBeLessThan(usersTableIndex);
    expect(orderStatusIndex).toBeLessThan(pedidosTableIndex);
  });
});
