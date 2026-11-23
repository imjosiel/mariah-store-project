# PRODUCT.md — Maria's Store

## Visão do Produto

**Maria's Store** é uma loja editorial de moda casual feminina com um ERP mínimo acoplado. A vitrine troca a atmosfera cromática conforme a cor da peça; o lado operacional cobre cadastro, estoque, pedidos, caixa, clientes e PDV sem dependência de sistema externo.

## Público & Contexto de Uso

- **Quem compra:** mulheres que buscam peças casuais sofisticadas e versáteis (alfaiataria leve em linho, tricot macio, vestidos fluidos, jaquetas estruturadas e bolsas atemporais).
- **Como chegam:** predominantemente pelo celular (Instagram, link na bio, WhatsApp), além de navegação desktop editorial.
- **O que decidem em segundos:** ver o caimento, testar as variações reais de cor, conferir numeração disponível e finalizar sem fricção — pelo WhatsApp ou, quando ativado, pelo Pix com QR Code.
- **Quem opera:** a dona da loja e o super administrador (desenvolvedor), em perfis distintos. Áreas sensíveis são exclusivas do super admin.

## Estado Atual

**Fase 1 — vitrine editorial (entregue).** Next.js (App Router, TypeScript, Tailwind, Motion), catálogo no banco, transições orbitais, seletor de cor que muda a atmosfera da tela, sacola lateral e geração de pedido para WhatsApp.

**Fase 2 — ERP mínimo (entregue).** Neon (PostgreSQL) + Prisma, deploy na Vercel, Auth.js v5 com Google e allowlist dinâmica. Cadastro de peças com várias cores, imagem recortada no navegador, atmosfera automática e alterável, categorias, estoque por cor/tamanho, arquivamento e exclusão de peças. Pedidos com confirmação, envio, entrega, cancelamento com estorno e pós-venda (troca/devolução/defeito). Comissão configurável, relatório financeiro, CSV e notas fiscais manuais.

**Fase 3 — PDV e pagamentos (entregue, desligado em produção).** Venda na loja com grade de peças, carrinho por unidade, desconto por peça ou no pedido em R$ ou %, resumo com itens/desconto/subtotal/taxas/total. Clientes com CPF/CNPJ mascarado e reaproveitamento do cliente no Asaas. Integração com Asaas preparada: cobrança Pix com split em valor fixo, webhook com idempotência, estornos. **Todo o gateway está desativado por padrão** — a vitrine continua operando só com WhatsApp até as credenciais de produção serem configuradas e o super admin ligar o Pix.

**Em aberto (humano, não técnico):** formalização do contrato de comissão (minuta em `docs/07 §3`) e documentação contábil do desenvolvedor.

## Decisões de Plataforma (não reabrir sem ADR)

- **Backend:** Next.js (Route Handlers / Server Actions), com regras de negócio puras em `src/domain/`, isoladas de React/Prisma.
- **Banco:** Neon (PostgreSQL) com `DATABASE_URL` poolada e `DIRECT_URL` para migrations. Prisma 6.19.3.
- **Deploy:** Vercel, automático a partir de `main`.
- **Autenticação:** somente área administrativa, via Auth.js v5 + Google. Allowlist no banco; primeira conta vira super admin. Detalhes em `docs/09-AUTH.md`.
- **Fotos:** Cloudflare R2 com cota de 1 GB ajustável pelo super admin; remoção de fundo no navegador.
- **Fechamento:** WhatsApp (`wa.me`, sem API paga) como padrão. Gateway Asaas disponível, desligado até homologação. Nenhum desconto é exibido sem ser aplicado.
- **Fiscal:** sem emissor pago. Formalização como MEI (CNAE 4781-4/00) antes de 01/01/2027; emissão manual na Nota Fiscal Fácil do RS. Ver `docs/08-FISCAL.md`.
- **Comissão:** percentual configurável da margem bruta por peça (preço recebido − custo), com prazo de arrependimento por origem da venda. Ver `docs/07-COMMERCE-AND-MONEY.md`.
- **Textos técnicos:** nunca aparecem na interface — ficam em `docs/`.

## Verificação

`npm run verify` (typecheck, lint, testes unitários/de integração, build) e `npm run test:e2e` antes de publicar. Testes de integração usam o banco com dados temporários e cleanup; testes do gateway usam mocks, sem depender de conta externa.
