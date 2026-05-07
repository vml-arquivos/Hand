-- Migration: 0003_rifa_platform_core
-- Descrição: Cria estrutura para admin_users, premios, rifa_assets e audit_logs

-- 1. Tabela de usuários administrativos
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin', -- super_admin, admin, operador
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Tabela de prêmios vinculados a rifas
CREATE TABLE IF NOT EXISTS premios (
    id SERIAL PRIMARY KEY,
    rifa_id INTEGER NOT NULL REFERENCES rifas(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    imagem_url TEXT,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Tabela de assets (imagens e arquivos)
CREATE TABLE IF NOT EXISTS rifa_assets (
    id SERIAL PRIMARY KEY,
    rifa_id INTEGER REFERENCES rifas(id) ON DELETE SET NULL,
    premio_id INTEGER REFERENCES premios(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'rifa_main', 'premio', 'comprovante'
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'rifa', 'pedido', 'premio', 'admin_user'
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Adicionar campos extras em pedidos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='comprovante_url') THEN
        ALTER TABLE pedidos ADD COLUMN comprovante_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='observacao_admin') THEN
        ALTER TABLE pedidos ADD COLUMN observacao_admin TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='confirmado_por_user_id') THEN
        ALTER TABLE pedidos ADD COLUMN confirmado_por_user_id INTEGER REFERENCES admin_users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pedidos' AND column_name='cancelado_por_user_id') THEN
        ALTER TABLE pedidos ADD COLUMN cancelado_por_user_id INTEGER REFERENCES admin_users(id);
    END IF;
END $$;
