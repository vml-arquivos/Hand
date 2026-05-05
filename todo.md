# Project TODO

- [x] Analisar o ZIP enviado e o estado atual do repositório Hand.
- [x] Implementar modelagem de rifas, compradores, pedidos e bilhetes com status pendente, confirmado e cancelado.
- [x] Implementar backend para carregar rifa pública, criar pedido pendente, confirmar pagamento manualmente, cancelar pedido e editar configurações da rifa.
- [x] Garantir que bilhetes sejam gerados e atribuídos apenas após confirmação manual do administrador.
- [x] Criar página pública elegante da rifa com progresso de vendas e formulário de compra sem login.
- [x] Criar tela de Pix estático com QR Code e Pix Copia e Cola após finalizar pedido.
- [x] Criar comprovante amigável para impressão/PDF pelo navegador com dados do comprador, bilhetes e status.
- [x] Criar painel administrativo protegido com visão geral, listagem de pedidos, confirmação e cancelamento.
- [x] Criar tela de configurações administrativas da rifa, incluindo nome, descrição, total, preço, chave Pix e imagem.
- [x] Adicionar arquivos Dockerfile, docker-compose e documentação para deploy no Coolify com PostgreSQL.
- [x] Adicionar testes automatizados para as principais regras de negócio.
- [x] Validar build/testes/status do projeto, salvar checkpoint e fazer commit no GitHub.
- [x] Entregar resumo técnico, modelagem e instruções finais ao usuário.


- [x] Revisar arquivos Docker e documentação para deploy em Coolify com app e PostgreSQL 17 em containers separados.
- [x] Preparar lista clara de variáveis de ambiente necessárias para o Coolify.
- [x] Criar passo a passo simples e não técnico para instalar pela interface do Coolify a partir do repositório público.
- [x] Validar, salvar checkpoint e atualizar o GitHub com as instruções finais de deploy.

- [x] Salvar um novo checkpoint após as mudanças finais de deploy para Coolify.
- [x] Enviar ao GitHub as alterações finais de deploy e documentação.
- [x] Registrar no guia final que o build Docker não foi executado no sandbox porque Docker não está instalado, embora TypeScript, testes e build da aplicação tenham passado.

- [x] Corrigir Dockerfile para copiar a pasta `patches` antes do `pnpm install`, resolvendo erro ENOENT no Coolify.
- [ ] Validar a correção de build e enviar novo commit ao GitHub.
