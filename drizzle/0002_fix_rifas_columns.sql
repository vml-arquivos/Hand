-- Migration: 0002_fix_rifas_columns
-- Descrição: Garante que a tabela rifas tenha as colunas premio e dataSorteio

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rifas' AND column_name='premio') THEN
        ALTER TABLE rifas ADD COLUMN premio varchar(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rifas' AND column_name='dataSorteio') THEN
        ALTER TABLE rifas ADD COLUMN dataSorteio varchar(120);
    END IF;
END $$;
