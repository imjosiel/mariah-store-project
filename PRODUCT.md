# PRODUCT.md — Maria's Store

## Visão do Produto
**Maria's Store** é uma loja digital de moda casual feminina elegante, pensada para unir a experiência visual de um *showcase* interativo de alta moda com a simplicidade operacional de uma loja independente brasileira (catálogo ágil e fechamento integrado via Sacola / WhatsApp, pronto para banco serverless no **Neon PostgreSQL** com **Prisma ORM**).

## Público & Contexto de Uso
- **Quem compra:** Mulheres que buscam peças casuais sofisticadas e versáteis (alfaiataria leve em linho, tricot macio, vestidos fluidos, jaquetas estruturadas e bolsas atemporais).
- **Como chegam:** Majoritariamente pelo celular (Instagram Stories, link na bio e links diretos enviados no WhatsApp), além de navegação desktop editorial.
- **O que precisam decidir em segundos:** Ver o caimento/volume da peça, testar as variações reais de cor na hora, conferir numeração disponível (`PP` ao `GG` / `36` ao `42`) com guia de medidas claro e enviar a sacola pronta sem fricção.

## Arquitetura & Evolução Planejada
1. **Fase 1 (Atual):** Front-end completo em Next.js (App Router + TypeScript + Tailwind CSS + Motion), catálogo mockado tipado espelhando o schema Prisma, transições orbitais/editoriais e sacola lateral funcional com geração de pedido formatado para WhatsApp.
2. **Fase 2 (Próxima):** Conexão direta com **Neon.tech (PostgreSQL)** via **Prisma ORM** (`prisma/schema.prisma` já estruturado no repositório), em **Vercel**. Painel administrativo com **ERP/CRM mínimo próprio** — a loja não possui sistema anterior para integrar: cadastro de peças com custo, estoque por variação/tamanho, pedidos, clientes leves, caixa da comissão e relatório para o contador. Remoção automática de fundo no upload. Fechamento via WhatsApp (`wa.me`, sem API paga) e Pix direto. Regras de dinheiro em `docs/07`; regras fiscais em `docs/08`.

## Decisões de Plataforma (não reabrir sem ADR)
- **Backend:** Next.js (Route Handlers / Server Actions), com regras de negócio puras em `src/domain/`, isoladas de React/Prisma.
- **Deploy:** Vercel + Neon.
- **Autenticação:** somente área administrativa, via Auth.js v5 + Google (`/login`, allowlist em `ADMIN_EMAILS`, proteção em `src/proxy.ts`). Cliente não precisa de login — a compra acontece no WhatsApp. Detalhes em `docs/09-AUTH.md`.
- **WhatsApp:** link `wa.me` gratuito; confirmação do pedido é um clique no admin. Sem Cloud API, sem Baileys/Evolution.
- **Fiscal:** sem emissor pago. Formalização como MEI (CNAE 4781-4/00) antes de 01/01/2027; emissão manual na Nota Fiscal Fácil do RS. Ver `docs/08-FISCAL.md`.
- **Comissão:** 10% da margem bruta por peça (preço recebido − custo), com prazo de 7 dias. Ver `docs/07-COMMERCE-AND-MONEY.md`.
