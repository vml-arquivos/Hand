-- Adiciona colunas professor e turma na tabela vendedores
ALTER TABLE "vendedores" ADD COLUMN IF NOT EXISTS "professor" varchar(180);
ALTER TABLE "vendedores" ADD COLUMN IF NOT EXISTS "turma" varchar(100);
