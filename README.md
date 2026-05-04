# Sistema de Rifas Beneficentes

Sistema full-stack para rifas online beneficentes voltadas a escolas, creches, times e pequenas instituições. A compra pública funciona sem login. O comprador informa nome, telefone/WhatsApp e e-mail opcional, cria um pedido com status `pendente`, visualiza o QR Code Pix estático e aguarda a validação manual do administrador.

A regra central é que **os bilhetes nunca são gerados automaticamente no momento da compra**. Eles só são criados quando o administrador confirma manualmente o pagamento no painel. Os status aceitos para pedidos são exatamente `pendente`, `confirmado` e `cancelado`.

## Modelagem PostgreSQL

| Tabela | Finalidade |
|---|---|
| `rifas` | Configura nome, descrição, imagem, total de bilhetes, preço e dados Pix. |
| `compradores` | Armazena nome, telefone obrigatório e e-mail opcional. |
| `pedidos` | Controla quantidade, valor total e status `pendente`, `confirmado` ou `cancelado`. |
| `bilhetes` | Guarda os números atribuídos após confirmação manual. Possui unicidade por rifa e número. |
| `users` | Mantida pela base da aplicação para compatibilidade com autenticação original. |

## Desenvolvimento local

```bash
pnpm install
export DATABASE_URL="postgresql://rifas:rifas_senha_forte@localhost:5432/rifas"
export ADMIN_PASSWORD="admin123"
pnpm build
pnpm start
```

Para criar as tabelas, aplique `drizzle/0001_rifas_postgres.sql` no PostgreSQL.

## Deploy

Consulte `COOLIFY_DEPLOY.md`. O repositório inclui `Dockerfile` e `docker-compose.yml` com PostgreSQL.
