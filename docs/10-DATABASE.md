# 10 — Banco (Neon / Prisma)

## Estado (Fase 2 em andamento)

- Projeto Neon: `ancient-sky-34341454`, branch `production`, região AWS US East 2.
- PostgreSQL 18, banco `neondb`, role `neondb_owner`.
- Schema aplicado com `prisma migrate dev --name init` → `prisma/migrations/<ts>_init/`.
- Catálogo cadastrado diretamente no banco (5 categorias, 6 produtos, 11 variações, 40 estoques). Não existe mais arquivo de seed nem catálogo mock.
- Endpoint de prova: `GET /api/health` → contagens do banco.

## Env vars

`.env.local` e `.env` (ambos ignorados pelo git):

```env
DATABASE_URL=postgresql://...@...-pooler.../neondb?...pgbouncer=true...
DIRECT_URL=postgresql://...@....../neondb?...
```

- `DATABASE_URL` = connection string **pooled** (pooler da Neon, com `pgbouncer=true`).
- `DIRECT_URL` = conexão **direta**, usada pelo Prisma para migrations.

`.env.example` traz os placeholders. Na **Vercel** é preciso cadastrar manualmente:
`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`AUTH_*` — e atualizar as URIs do cliente OAuth para o domínio real. Não há mais variáveis de admin: a primeira conta que loga vira super admin.

## Comandos

```bash
npx prisma validate
npx prisma migrate dev --name <nome>
npm run verify
```

## Notas

- Prisma fixado em **6.19.3**: a 8 é RC com CLI incompatível, e a 7 exigiria migrar o gerador
  `prisma-client-js` para `prisma-client`. Reavaliar quando a 8 estabilizar.
- `npm audit` reporta 4 avisos `high` em `effect`, dependência **apenas do CLI de desenvolvimento**
  (`prisma → @prisma/config → effect`). Não entra no bundle de produção (`@prisma/client`).
- Fotos enviadas pelo ERP em **Cloudflare R2** (fora do repositório): campo "Trocar imagem" em cada cor, em `/admin/produtos`. Requer `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` e `R2_PUBLIC_URL` na Vercel; `next.config.ts` autoriza o hostname de `R2_PUBLIC_URL`.
- O fundo da foto é removido **no navegador** por `@imgly/background-removal` (modelo `isnet_quint8`) antes do upload, gerando WebP com alpha. A cor da amostra é inferida do recorte — isso é comportamento do sistema, não texto para a interface.
- O modelo é **pré-carregado ao abrir qualquer página do admin** (`preloadCutout` na layout), para que o primeiro upload não espere o download dos ~40 MB. O cache fica no navegador; o preload é chamado uma vez por sessão.
- Upload acontece ao salvar a cor ou ao criar uma peça; não existe botão de "enviar imagem" separado.

## Convenção de texto da interface

Detalhes de implementação **não aparecem na tela** — ficam apenas neste documento e no `docs/07`. A interface fala de peça, cor, tamanho e preço; não menciona R2, upload, modelo de IA, "regra de ouro" nem prazos de comissão. Isso evita vazar arquitetura para quem usa o ERP e evita textos desatualizados quando a infra muda.
- Cota por loja em `StorageSetting` (padrão **1 GB**), ajustável pelo super admin em `/admin/armazenamento`. O upload soma os tamanhos dos objetos via `ListObjectsV2` e bloqueia se estourar o limite. As 11 imagens antigas em `public/products/` seguem como fallback.
- **Arquivamento de peças:** `Product.archivedAt` (migration `20261122003921_archive_products`). "Arquivar" é o único tipo de exclusão oferecido: a peça sai da vitrine (`getProductsFromDb` filtra `archivedAt: null`) e da lista padrão do ERP, mas `Product`, variações, estoque, `OrderItem`, NF e comissão permanecem intactos. A lista do ERP tem "Ver arquivadas" para reativar. Não existe exclusão física porque `OrderItem` referencia `Product` sem `onDelete: Cascade` — apagar apagaria histórico fiscal. Vale para qualquer peça, inclusive as que já venderam.
- `/admin/produtos` edita **preço, custo e estoque por cor/tamanho** no banco e `/admin/produtos/novo`
  cadastra **novas peças** (produto + primeira cor + estoque) e permite **adicionar novas cores**
  com estoque por tamanho a peças existentes — ERP mínimo completo.
- **Fontes da verdade já migradas para o banco:** catálogo (`Product`/`Category`/`ProductVariant`),
  admins (`Admin`), custos (`Product.costInCents`), pedidos (`Order`/`OrderItem`) e estoque
  (`VariantStock`). A vitrine lê `getProductsFromDb()` e as categorias vêm do banco. Sem mocks:
  nada de `PRODUCTS`/`CATEGORIES` em código. A sacola continua em `localStorage` — é estado de navegador.
- O frontend lê o estoque do banco via `GET /api/stock` e hidrata o cache local; confirmação de
  pedido baixa o estoque em transação no Prisma.
- O domínio em `src/domain/` não mudou — só os adaptadores.
