-- Migration: 0004_multi_owner_rifas
-- Descrição: Adiciona owner_admin_id em rifas para isolamento multi-usuário

-- 1. Adicionar coluna owner_admin_id em rifas (nullable para compatibilidade com rifas existentes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rifas' AND column_name = 'owner_admin_id'
    ) THEN
        ALTER TABLE rifas
            ADD COLUMN owner_admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Atribuir rifas existentes sem owner ao primeiro super_admin (ou primeiro admin ativo)
UPDATE rifas
SET owner_admin_id = (
    SELECT id FROM admin_users
    WHERE active = TRUE
    ORDER BY
        CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END,
        id ASC
    LIMIT 1
)
WHERE owner_admin_id IS NULL;

-- 3. Índice para busca rápida de rifas por owner
CREATE INDEX IF NOT EXISTS idx_rifas_owner_admin_id ON rifas(owner_admin_id);
