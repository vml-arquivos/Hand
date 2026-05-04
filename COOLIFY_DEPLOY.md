# Deploy no Coolify com PostgreSQL

Este projeto está pronto para deploy em VPS usando Coolify. A aplicação usa React, Express, tRPC e PostgreSQL. O fluxo público não exige login; o painel administrativo é protegido pela variável `ADMIN_PASSWORD`.

## Variáveis de ambiente

| Variável | Exemplo | Observação |
|---|---:|---|
| `DATABASE_URL` | `postgresql://rifas:senha@postgres:5432/rifas` | String de conexão PostgreSQL. |
| `ADMIN_PASSWORD` | `uma-senha-forte` | Senha usada na rota `/admin`. |
| `JWT_SECRET` | `segredo-longo` | Mantido para compatibilidade da base Express. |
| `PORT` | `3000` | Porta interna do container. |
| `VITE_APP_TITLE` | `Sistema de Rifas Beneficentes` | Título da aplicação. |

## Opção 1: Docker Compose no Coolify

Crie um novo recurso do tipo Docker Compose, conecte o repositório e use o arquivo `docker-compose.yml`. Altere as senhas antes de publicar. Após o primeiro deploy, execute a migration SQL `drizzle/0001_rifas_postgres.sql` no banco PostgreSQL pelo terminal do container ou pelo cliente SQL do Coolify.

```bash
psql "$DATABASE_URL" -f drizzle/0001_rifas_postgres.sql
```

## Opção 2: Aplicação + banco gerenciado no Coolify

Crie um PostgreSQL no Coolify, copie a connection string para `DATABASE_URL` e faça o deploy da aplicação com o `Dockerfile`. Configure também `ADMIN_PASSWORD` e `JWT_SECRET`. Depois aplique o SQL de criação das tabelas em `drizzle/0001_rifas_postgres.sql`.

## Rotas principais

| Rota | Função |
|---|---|
| `/` | Página pública da rifa padrão. |
| `/rifa/rifa-beneficente` | Link direto público da campanha. |
| `/comprovante/:codigo` | Comprovante imprimível ou salvável em PDF pelo navegador. |
| `/admin` | Painel administrativo protegido por senha. |
