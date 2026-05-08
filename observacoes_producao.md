# Observações do sistema em produção — rifa.permupay.com.br

## Estado atual (08/05/2026)

### O que está funcionando:
- Página principal carregando corretamente
- Imagem da rifa aparecendo (flyer com foto do time)
- Preço do bilhete: R$ 20,00 ✓
- Data do sorteio: 19/09/2026 ✓
- Prêmio exibido ✓
- Prêmios da campanha com imagem ✓
- Progresso da campanha: 4% (478 disponíveis, 22 confirmados, 12 aguardando) ✓
- QR Code Pix aparecendo na pré-visualização ✓
- Formulário de checkout funcionando ✓

### Problemas visuais identificados:
1. Seção de prêmios: card com texto truncado "2 finais de Semana e..." — precisa mostrar mais
2. Layout desktop: coluna esquerda (info) + coluna direita (checkout) — OK
3. Sem link "Meus bilhetes" / "Buscar meu pedido" — comprador não consegue voltar
4. Sem banner de "pedido pendente" para quem já comprou

### Fluxo de acesso pós-compra (problema principal):
- Após fazer pedido → redireciona para /comprovante/RF...
- Se fechar o navegador → sem forma de voltar
- Não tem login, não tem busca por telefone
- SOLUÇÃO: implementar /meus-bilhetes com busca por telefone + localStorage
