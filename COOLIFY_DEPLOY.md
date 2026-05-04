# Guia simples para instalar no Coolify com PostgreSQL 17

Este guia foi escrito para instalar o sistema de rifas na sua VPS usando **Coolify**. A ideia é ter **dois containers**: um container para o sistema e outro container para o banco **PostgreSQL 17**. O projeto já inclui o `Dockerfile`, o `docker-compose.yml`, o arquivo `.env.coolify.example` e uma migração automática que prepara as tabelas na primeira inicialização.

> Importante: o sistema não usa gateway de pagamento. O comprador faz a pré-compra, vê o Pix, e o administrador confirma manualmente o pagamento. Os bilhetes só são gerados depois da confirmação manual no painel.

## O que você vai precisar

Você precisa ter uma VPS com o Coolify instalado, acesso ao painel do Coolify pelo navegador e o repositório público conectado ao Coolify. O repositório esperado é `https://github.com/vml-arquivos/Hand`.

| Item | O que preencher |
|---|---|
| Repositório | `https://github.com/vml-arquivos/Hand` |
| Porta interna do sistema | `3000` |
| Banco de dados | PostgreSQL 17 |
| Painel administrativo | `/admin` |
| Página pública | `/` ou `/rifa/rifa-beneficente` |
| Comprovante | `/comprovante/CODIGO-DO-PEDIDO` |

## Variáveis que você deve configurar

No Coolify, você encontrará uma área chamada **Environment Variables** ou **Variáveis de Ambiente**. Copie as variáveis abaixo e troque somente os valores de senha.

| Variável | Valor sugerido | Para que serve |
|---|---|---|
| `NODE_ENV` | `production` | Informa que o sistema está em produção. |
| `PORT` | `3000` | Porta interna usada pelo container do sistema. |
| `VITE_APP_TITLE` | `Sistema de Rifas Beneficentes` | Nome que aparece no navegador/app. |
| `POSTGRES_DB` | `rifas` | Nome do banco de dados. |
| `POSTGRES_USER` | `rifas` | Usuário do banco. |
| `POSTGRES_PASSWORD` | `crie-uma-senha-forte` | Senha do banco PostgreSQL. |
| `DATABASE_URL` | `postgresql://rifas:SENHA_DO_BANCO@postgres:5432/rifas` | Endereço completo de conexão com o banco. |
| `ADMIN_PASSWORD` | `crie-uma-senha-do-admin` | Senha para entrar no painel `/admin`. |
| `JWT_SECRET` | `texto-longo-com-mais-de-32-caracteres` | Chave interna de segurança da aplicação. |
| `DB_MIGRATION_ATTEMPTS` | `30` | Quantas vezes o app tenta esperar o banco iniciar. |
| `DB_MIGRATION_DELAY_MS` | `2000` | Tempo de espera entre tentativas, em milissegundos. |

A variável mais importante é a `DATABASE_URL`. Se você usar o `docker-compose.yml` deste projeto, o nome do banco dentro da rede será `postgres`, então a conexão fica assim:

```env
DATABASE_URL=postgresql://rifas:SUA_SENHA_DO_BANCO@postgres:5432/rifas
```

Se você criar o PostgreSQL pelo recurso nativo do Coolify, copie a connection string que o Coolify mostrar e cole em `DATABASE_URL`. Nesse caso, o endereço pode ser diferente de `postgres`, e você deve usar exatamente o valor fornecido pelo Coolify.

## Forma mais fácil: usar Docker Compose do repositório

Esta é a forma mais simples porque o arquivo `docker-compose.yml` já cria o container do sistema e o container do PostgreSQL 17 juntos.

| Passo | O que fazer no Coolify |
|---|---|
| 1 | Entre no painel do Coolify. |
| 2 | Clique em **New Resource** ou **Novo Recurso**. |
| 3 | Escolha **Docker Compose**. |
| 4 | Conecte o repositório `vml-arquivos/Hand`. |
| 5 | Confirme que o arquivo usado será `docker-compose.yml`. |
| 6 | Abra a área de variáveis e cole as variáveis do arquivo `.env.coolify.example`. |
| 7 | Troque `POSTGRES_PASSWORD`, `ADMIN_PASSWORD` e `JWT_SECRET` por valores fortes. |
| 8 | Clique em **Deploy**. |
| 9 | Aguarde o build terminar e o status ficar saudável/online. |
| 10 | Abra o domínio gerado pelo Coolify e teste a página pública. |

Depois do primeiro deploy, o sistema tenta criar automaticamente as tabelas no banco. Você não precisa executar SQL manualmente se o container iniciar normalmente.

## Forma alternativa: app e PostgreSQL nativo separados no Coolify

Use esta opção se você preferir criar primeiro um banco PostgreSQL no Coolify e depois criar a aplicação separada apontando para esse banco.

| Passo | O que fazer |
|---|---|
| 1 | No Coolify, crie um novo recurso **PostgreSQL**. |
| 2 | Escolha a versão **PostgreSQL 17**. |
| 3 | Defina o banco como `rifas`, usuário `rifas` e uma senha forte. |
| 4 | Salve e inicie o PostgreSQL. |
| 5 | Copie a string de conexão exibida pelo Coolify. |
| 6 | Crie um novo recurso de **Application** usando o repositório `vml-arquivos/Hand`. |
| 7 | Escolha deploy via **Dockerfile**. |
| 8 | Em variáveis, cole `DATABASE_URL` com a conexão copiada do banco. |
| 9 | Adicione também `ADMIN_PASSWORD`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=3000` e `VITE_APP_TITLE`. |
| 10 | Configure a porta interna como `3000`. |
| 11 | Clique em **Deploy**. |

Nesta opção, o banco e o sistema ficam em recursos separados, mas o funcionamento é o mesmo. Ao iniciar, o sistema aguarda o banco ficar disponível e cria as tabelas automaticamente se elas ainda não existirem.

## Como testar depois do deploy

Quando o deploy terminar, abra o domínio fornecido pelo Coolify. A página inicial deve mostrar a rifa pública, com nome, descrição, preço, progresso de vendas e formulário de compra. Faça um pedido de teste com nome e telefone, finalize e confira se a tela do Pix aparece com QR Code e código copia-e-cola.

Depois, acesse `/admin`, informe a senha definida em `ADMIN_PASSWORD` e localize o pedido pendente. Clique para confirmar pagamento. Somente nesse momento os bilhetes serão gerados. Em seguida, abra o comprovante do pedido e use o comando de imprimir do navegador para salvar em PDF.

| Teste | Resultado esperado |
|---|---|
| Criar pedido público | Pedido nasce com status `pendente`. |
| Finalizar pedido | Tela mostra QR Code Pix e Pix Copia e Cola. |
| Confirmar no admin | Pedido muda para `confirmado` e os bilhetes são gerados. |
| Cancelar no admin | Pedido muda para `cancelado` e não recebe bilhetes. |
| Abrir comprovante | Mostra dados do comprador, status e números dos bilhetes. |

## Arquivos importantes do deploy

| Arquivo | Função |
|---|---|
| `Dockerfile` | Monta o container da aplicação. |
| `docker-compose.yml` | Sobe aplicação + PostgreSQL 17 juntos. |
| `.env.coolify.example` | Modelo de variáveis para copiar no Coolify. |
| `scripts/apply-migrations.mjs` | Cria as tabelas automaticamente na primeira inicialização. |
| `drizzle/0001_rifas_postgres.sql` | SQL com a estrutura do banco e rifa inicial. |

## Se algo der errado

Se a aplicação não abrir, primeiro confira se o PostgreSQL está online e se a `DATABASE_URL` está correta. Se o painel `/admin` não aceitar a senha, revise a variável `ADMIN_PASSWORD`. Se a página abrir, mas não salvar pedidos, o problema quase sempre estará na conexão do banco ou em uma senha diferente entre `POSTGRES_PASSWORD` e `DATABASE_URL`.

## Checklist final antes de vender rifas

Antes de divulgar o link, entre no painel administrativo e edite as configurações da rifa. Ajuste o nome, descrição, preço, total de bilhetes, imagem, chave Pix e código Pix Copia e Cola. Depois faça uma compra de teste, confirme manualmente no admin, confira os bilhetes e verifique o comprovante.

## Validação feita antes da entrega

Antes de enviar esta versão ao GitHub, foram executadas as validações `pnpm check`, `pnpm test` e `pnpm build`, todas com sucesso. O build Docker não foi executado dentro do sandbox de desenvolvimento porque o comando `docker` não está disponível nesse ambiente. Mesmo assim, o `Dockerfile` foi ajustado para iniciar a aplicação em produção e executar automaticamente a preparação do banco antes de subir o servidor.
