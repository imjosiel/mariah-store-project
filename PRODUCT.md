# PRODUCT.md — Maria's Store

## Visão do Produto
**Maria's Store** é uma loja digital de moda casual feminina elegante, pensada para unir a experiência visual de um *showcase* interativo de alta moda com a simplicidade operacional de uma loja independente brasileira (catálogo ágil e fechamento integrado via Sacola / WhatsApp, pronto para banco serverless no **Neon PostgreSQL** com **Prisma ORM**).

## Público & Contexto de Uso
- **Quem compra:** Mulheres que buscam peças casuais sofisticadas e versáteis (alfaiataria leve em linho, tricot macio, vestidos fluidos, jaquetas estruturadas e bolsas atemporais).
- **Como chegam:** Majoritariamente pelo celular (Instagram Stories, link na bio e links diretos enviados no WhatsApp), além de navegação desktop editorial.
- **O que precisam decidir em segundos:** Ver o caimento/volume da peça, testar as variações reais de cor na hora, conferir numeração disponível (`PP` ao `GG` / `36` ao `42`) com guia de medidas claro e enviar a sacola pronta sem fricção.

## Arquitetura & Evolução Planejada
1. **Fase 1 (Atual):** Front-end completo em Next.js (App Router + TypeScript + Tailwind CSS + Motion), catálogo mockado tipado espelhando o schema Prisma, transições orbitais/editoriais e sacola lateral funcional com geração de pedido formatado para WhatsApp.
2. **Fase 2 (Próxima):** Conexão direta com **Neon.tech (PostgreSQL)** via **Prisma ORM** (`prisma/schema.prisma` já estruturado no repositório), painel administrativo simplificado para cadastro de peças/estoque com remoção automática de fundo no upload e sincronização de pedidos via WhatsApp / Pix.
