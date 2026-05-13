-- Adiciona coluna rastreamento_vendedores na tabela rifas
ALTER TABLE "rifas" ADD COLUMN IF NOT EXISTS "rastreamento_vendedores" boolean DEFAULT false NOT NULL;

-- Cria a tabela vendedores
CREATE TABLE IF NOT EXISTS "vendedores" (
"id" serial PRIMARY KEY NOT NULL,
"rifa_id" integer NOT NULL,
"nome" varchar(180) NOT NULL,
"codigo" varchar(50) NOT NULL,
"ativo" boolean DEFAULT true NOT NULL,
"created_at" timestamp DEFAULT now() NOT NULL,
"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Adiciona a coluna vendedor_id na tabela pedidos
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "vendedor_id" integer;

-- Adiciona as constraints de chave estrangeira e índices
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_vendedor_id_vendedores_id_fk') THEN
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_vendedor_id_vendedores_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores"("id") ON DELETE SET NULL;
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendedores_rifa_id_rifas_id_fk') THEN
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_rifa_id_rifas_id_fk" FOREIGN KEY ("rifa_id") REFERENCES "rifas"("id") ON DELETE CASCADE;
END IF;
END
$$;

-- Cria índice único para código do vendedor por rifa
CREATE UNIQUE INDEX IF NOT EXISTS "vendedores_rifa_codigo_unique" ON "vendedores" ("rifa_id", "codigo");
