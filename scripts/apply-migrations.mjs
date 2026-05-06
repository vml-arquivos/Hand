-- ============================================================
-- MIGRAÇÃO: Adiciona colunas faltantes na tabela "rifas"
-- Execute este script diretamente no PostgreSQL de produção
-- ============================================================

-- 1. Adiciona coluna "premio" (campo opcional)
ALTER TABLE "rifas"
  ADD COLUMN IF NOT EXISTS "premio" varchar(255);

-- 2. Adiciona coluna "dataSorteio" (campo opcional)
ALTER TABLE "rifas"
  ADD COLUMN IF NOT EXISTS "dataSorteio" varchar(120);

-- 3. Verifica resultado
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'rifas'
ORDER BY ordinal_position;
