-- Migração 0005: thumbnail OG, campos recebedor Pix e limpeza de bilhetes

-- Adiciona thumbnail_url para Open Graph (preview ao compartilhar link)
ALTER TABLE "rifas" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;

-- Adiciona nome_recebedor e cidade_recebedor para geração do Pix BR Code
ALTER TABLE "rifas" ADD COLUMN IF NOT EXISTS "nome_recebedor" VARCHAR(180);
ALTER TABLE "rifas" ADD COLUMN IF NOT EXISTS "cidade_recebedor" VARCHAR(120);
