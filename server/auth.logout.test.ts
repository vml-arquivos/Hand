import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// O sistema de rifa usa o cookie "admin_token" para autenticação JWT
const ADMIN_COOKIE_NAME = "admin_token";

type CookieCall = {
  name: string;
  options?: Record<string, unknown>;
};

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    admin: {
      id: 1,
      name: "Admin Teste",
      email: "admin@teste.com",
      passwordHash: "hash",
      role: "super_admin",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options?: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      cookie: (_name: string, _value: string, _options?: Record<string, unknown>) => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("limpa o cookie admin_token e retorna sucesso", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(ADMIN_COOKIE_NAME);
  });
});
