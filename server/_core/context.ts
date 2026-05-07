import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, AdminUser } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getAdminById } from "../db";
import { jwtVerify } from "jose";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  admin: AdminUser | null;
};

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "troque_este_segredo_jwt_com_mais_de_32_caracteres");

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let admin: AdminUser | null = null;

  // 1. Autenticação de usuário comum (OAuth/SDK)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // 2. Autenticação de Admin via Cookie JWT
  const token = opts.req.cookies?.admin_token;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload && typeof payload.sub === "string") {
        admin = await getAdminById(parseInt(payload.sub));
      }
    } catch (error) {
      admin = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    admin,
  };
}
