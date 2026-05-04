# Sistema de Rifas Beneficentes

Sistema web para rifas online de escolas, creches, times e ações beneficentes. O comprador acessa um link público, escolhe a quantidade de bilhetes, informa nome e telefone/WhatsApp, finaliza uma pré-compra e recebe as instruções Pix. O administrador confere o Pix manualmente e só então confirma o pedido, momento em que os números dos bilhetes são gerados.

A regra central é que **os bilhetes nunca são gerados automaticamente no momento da compra**. Eles só são criados quando o administrador confirma manualmente o pagamento no painel. Os status aceitos para pedidos são exatamente `pendente`, `confirmado` e `cancelado`.

## Funcionalidades principais

| Área | O que existe |
|---|---|
| Página pública | Nome da rifa, descrição, imagem, preço, progresso de vendas e formulário de compra. |
| Compra | Nome e telefone obrigatórios, e-mail opcional e pedido inicial como `pendente`. |
| Pix | QR Code estático e Pix Copia e Cola configurável no painel. |
| Bilhetes | Gerados somente depois da confirmação manual do administrador. |
| Comprovante | Tela amigável para imprimir ou salvar como PDF pelo navegador. |
| Admin | Visão geral, pedidos pendentes/confirmados/cancelados, confirmação, cancelamento e configurações da rifa. |
| Deploy | `Dockerfile`, `docker-compose.yml`, PostgreSQL 17 e guia para Coolify. |

## Rotas principais

| Rota | Finalidade |
|---|---|
| `/` | Página pública principal. |
| `/rifa/rifa-beneficente` | Link direto da rifa padrão. |
| `/comprovante/:codigo` | Comprovante do pedido. |
| `/admin` | Painel administrativo protegido por senha. |

## Modelagem PostgreSQL

| Tabela | Finalidade |
|---|---|
| `rifas` | Configura nome, descrição, imagem, total de bilhetes, preço e dados Pix. |
| `compradores` | Armazena nome, telefone obrigatório e e-mail opcional. |
| `pedidos` | Controla quantidade, valor total e status `pendente`, `confirmado` ou `cancelado`. |
| `bilhetes` | Guarda os números atribuídos após confirmação manual. Possui unicidade por rifa e número. |
| `users` | Mantida pela base da aplicação para compatibilidade com autenticação original. |

A estrutura SQL está em `drizzle/0001_rifas_postgres.sql`. Em deploy com Docker, o script `scripts/apply-migrations.mjs` prepara o banco automaticamente na primeira inicialização.

## Deploy no Coolify

Para instalar em uma VPS com Coolify, leia o arquivo **`COOLIFY_DEPLOY.md`**. Ele explica o passo a passo para subir dois containers: um container da aplicação e outro container com PostgreSQL 17.

| Arquivo | Uso |
|---|---|
| `Dockerfile` | Build do container da aplicação. |
| `docker-compose.yml` | Sobe aplicação e PostgreSQL 17 juntos. |
| `.env.coolify.example` | Variáveis para copiar no Coolify. |
| `scripts/apply-migrations.mjs` | Prepara o banco automaticamente na primeira inicialização. |

## Variáveis essenciais

| Variável | Exemplo |
|---|---|
| `DATABASE_URL` | `postgresql://rifas:SENHA@postgres:5432/rifas` |
| `ADMIN_PASSWORD` | `senha-forte-do-admin` |
| `JWT_SECRET` | `texto-aleatorio-longo-com-mais-de-32-caracteres` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `VITE_APP_TITLE` | `Sistema de Rifas Beneficentes` |

## Desenvolvimento local

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

Para rodar localmente, configure `DATABASE_URL`, `ADMIN_PASSWORD` e `JWT_SECRET` no seu ambiente. Em produção no Coolify, use o guia `COOLIFY_DEPLOY.md`.
