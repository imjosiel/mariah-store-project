# 10 — Banco (Neon / Prisma)

## Estado (Fase 2 em andamento)

- Projeto Neon: `ancient-sky-34341454`, branch `production`, região AWS US East 2.
- PostgreSQL 18, banco `neondb`, role `neondb_owner`.
- Schema aplicado com `prisma migrate dev --name init` → `prisma/migrations/<ts>_init/`.
- Catálogo semeado com `npm run db:seed`: 5 categorias, 6 produtos, 11 variações, 40 estoques.
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
npm run db:seed
npm run verify
```

## Notas

- Prisma fixado em **6.19.3**: a 8 é RC com CLI incompatível, e a 7 exigiria migrar o gerador
  `prisma-client-js` para `prisma-client`. Reavaliar quando a 8 estabilizar.
- `npm audit` reporta 4 avisos `high` em `effect`, dependência **apenas do CLI de desenvolvimento**
  (`prisma → @prisma/config → effect`). Não entra no bundle de produção (`@prisma/client`).
- `/admin/produtos` edita **preço, custo e estoque por cor/tamanho** no banco e `/admin/produtos/novo`
  cadastra **novas peças** (produto + primeira cor + estoque) — ERP mínimo completo.
- **Fontes da verdade já migradas para o banco:** catálogo (`Product`/`Category`/`ProductVariant`),
  admins (`Admin`), custos (`Product.costInCents`), pedidos (`Order`/`OrderItem`) e estoque
  (`VariantStock`). A vitrine lê `getProductsFromDb()`; o mock só fornece dados editoriais ainda
  não modelados (medidas/avaliações). A sacola continua em `localStorage` — é estado de navegador.
- O frontend lê o estoque do banco via `GET /api/stock` e hidrata o cache local; confirmação de
  pedido baixa o estoque em transação no Prisma.
- O domínio em `src/domain/` não mudou — só os adaptadores.
