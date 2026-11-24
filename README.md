# Maria's Store

Vitrine editorial de moda casual feminina com um ERP mínimo acoplado. A cor da peça troca a atmosfera cromática da página; o lado operacional cobre cadastro, estoque, pedidos, caixa, clientes e PDV sem depender de sistema externo.

**Demo:** https://mariasstore.hidrasistemas.com.br

## O que faz

- **Vitrine editorial:** carrossel orbital, troca de cor que muda o fundo da tela, grade completa por categoria e sacola lateral.
- **ERP:** peças com várias cores e fotos recortadas no navegador, ATMOSFERA derivada da cor e ajustável, estoque por cor/tamanho, categorias, arquivamento e exclusão de peças.
- **Pedidos:** confirmação, envio, entrega, cancelamento com estorno de estoque e registro de troca/devolução/defeito.
- **PDV:** grade de peças, carrinho por unidade, desconto por peça ou no pedido em R$ ou %, resumo com itens/desconto/subtotal/taxas/total.
- **Financeiro:** comissão configurável por origem da venda, eventos de recebimento/estorno, relatório do super admin, CSV e nota fiscal manual.
- **Clientes:** cadastro por CPF/CNPJ (mascarado na interface) com histórico de pedidos.
- **Pagamentos:** Pix com split via Asaas e webhook idempotente — **preparado, mas desligado por padrão**; o checkout padrão é WhatsApp (`wa.me`, sem API paga).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, Motion |
| Backend | Server Actions + Route Handlers, regras puras em `src/domain/` |
| Banco | Neon (PostgreSQL) + Prisma 6.19.3 |
| Auth | Auth.js v5 com Google, allowlist no banco |
| Fotos | Cloudflare R2, remoção de fundo no navegador (`@imgly/background-removal`) |
| Pagamentos | Asaas (split com `fixedValue`, webhook) |
| Testes | Vitest (unitários, integração com banco e mocks do gateway) + Playwright |
| Deploy | Vercel |

## Rodando local

Pré-requisitos: Node 22+, conta no Neon, bucket no Cloudflare R2 e credenciais Google OAuth.

```bash
git clone https://github.com/imjosiel/mariah-store-project.git
cd marias-store
npm install
cp .env.example .env.local   # preencha as variáveis (ver docs/10)
npx prisma migrate dev
npm run dev -- -p 3010
```

Abra http://localhost:3010. A **primeira conta Google que entrar no `/admin` vira super admin**.

## Comandos

```bash
npm run dev          # desenvolvimento
npm run verify       # typecheck + lint + testes + build
npm run test:e2e     # Playwright (chromium + mobile)
npx prisma migrate dev --name <nome>
```

> Ao rodar testes de integração e o dev server ao mesmo tempo, o pooler do Neon pode esgotar conexões. Rode um de cada vez.

## Estrutura

```
src/
  app/                 # rotas (vitrine, /admin, /api/webhooks/asaas)
  components/          # HeroOrbitalShowcase, PDV, AdminShell, BagDrawer...
  context/             # sacola (localStorage)
  domain/              # regras puras: comissão, desconto, estoque, pedidos
  lib/                 # Prisma, Asaas, R2, catálogo, orderStore, customerStore
  admin-actions.ts     # ações do ERP (super admin para áreas sensíveis)
  order-actions.ts     # pedidos e comissão
  checkout-actions.ts  # cobrança Pix e configuração do checkout
prisma/migrations/     # histórico do schema
tests/e2e/             # fluxo de sacola → pedido
docs/                  # decisões (01 a 11)
```

## Documentação

- `PRODUCT.md` — visão, fases entregues e decisões de plataforma.
- `DESIGN.md` — identidade visual e atmosferas cromáticas.
- `docs/07` — regras de dinheiro, comissão e minuta de contrato.
- `docs/08` — fiscal (MEI, NFF, CFOP).
- `docs/09` — autenticação.
- `docs/10` — banco, R2, eventos financeiros e LGPD.
- `docs/11` — **como subir uma nova loja** (onboarding).

## Decisões que valem olhar

- A atmosfera da página é derivada da cor da peça, com pickers automáticos e alteráveis.
- A comissão é 10% da **margem bruta**, nunca do bruto; taxas de gateway ficam fora da base.
- O split no Asaas usa `fixedValue` em centavos, não percentual — percentual incidiria sobre o líquido e mudaria a regra.
- Webhook com idempotência pelo `id` do evento e token no header `asaas-access-token`.
- Cliente é reaproveitado no Asaas via `asaasCustomerId`; documento é mascarado na interface.
- Nenhum desconto aparece sem ser aplicado.
