CREATE TYPE IF NOT EXISTS "user_role" AS ENUM ('user', 'admin');
CREATE TYPE IF NOT EXISTS "order_status" AS ENUM ('pendente', 'confirmado', 'cancelado');

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "openId" varchar(64) NOT NULL UNIQUE,
  "name" text,
  "email" varchar(320),
  "loginMethod" varchar(64),
  "role" "user_role" NOT NULL DEFAULT 'user',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "lastSignedIn" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "rifas" (
  "id" serial PRIMARY KEY,
  "slug" varchar(120) NOT NULL UNIQUE,
  "nome" varchar(180) NOT NULL,
  "descricao" text NOT NULL,
  "imagemUrl" text,
  "totalBilhetes" integer NOT NULL CHECK ("totalBilhetes" > 0),
  "precoBilhete" numeric(10,2) NOT NULL CHECK ("precoBilhete" >= 0),
  "pixChave" varchar(255) NOT NULL,
  "pixCopiaCola" text NOT NULL,
  "ativa" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "compradores" (
  "id" serial PRIMARY KEY,
  "nome" varchar(180) NOT NULL,
  "telefone" varchar(40) NOT NULL,
  "email" varchar(320),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "pedidos" (
  "id" serial PRIMARY KEY,
  "codigo" varchar(32) NOT NULL UNIQUE,
  "rifaId" integer NOT NULL REFERENCES "rifas"("id"),
  "compradorId" integer NOT NULL REFERENCES "compradores"("id"),
  "quantidade" integer NOT NULL CHECK ("quantidade" > 0),
  "valorTotal" numeric(10,2) NOT NULL CHECK ("valorTotal" >= 0),
  "status" "order_status" NOT NULL DEFAULT 'pendente',
  "confirmadoEm" timestamp,
  "canceladoEm" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "bilhetes" (
  "id" serial PRIMARY KEY,
  "rifaId" integer NOT NULL REFERENCES "rifas"("id"),
  "pedidoId" integer NOT NULL REFERENCES "pedidos"("id"),
  "compradorId" integer NOT NULL REFERENCES "compradores"("id"),
  "numero" integer NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "bilhetes_rifa_numero_unique" UNIQUE ("rifaId", "numero")
);

CREATE INDEX IF NOT EXISTS "idx_pedidos_rifa_status" ON "pedidos"("rifaId", "status");
CREATE INDEX IF NOT EXISTS "idx_bilhetes_pedido" ON "bilhetes"("pedidoId");

INSERT INTO "rifas" ("slug", "nome", "descricao", "imagemUrl", "totalBilhetes", "precoBilhete", "pixChave", "pixCopiaCola")
VALUES (
  'rifa-beneficente',
  'Rifa Beneficente da Comunidade',
  'Ajude nossa escola, creche ou time a arrecadar recursos. Escolha seus bilhetes, pague via Pix e aguarde a confirmação manual do organizador.',
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
  500,
  10.00,
  'pix@instituicao.org',
  '00020126580014BR.GOV.BCB.PIX0136pix@instituicao.org520400005303986540510.005802BR5925INSTITUICAO BENEFICENTE6009SAO PAULO62110507RIFA0016304ABCD'
)
ON CONFLICT ("slug") DO NOTHING;
