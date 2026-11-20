# 09 — Autenticação (Admin)

## Estado

Auth.js v5 (`next-auth@5.0.0-beta.32`) protege todo o espaço `/admin` pela layout.
Rotas do painel: `/admin` (visão geral), `/admin/pedidos`, `/admin/produtos`,
`/admin/produtos/novo`, `/admin/usuarios`. Rotas públicas: `/`, `/politicas`,
`/login`, `/sem-acesso`, `/api/auth/*`. A sidebar é compartilhada via `AdminShell`.

- **Provedor:** Google. E-mail/senha e magic link **não** estão implementados (exigem provedor de e-mail com custo; ver decisão abaixo).
- **Sessão:** JWT (sem banco na Fase 1).
- **Autorização:** `src/domain/admin-access.ts` (puro, testado) + `src/app/admin/layout.tsx` (runtime Node). Só e-mails na allowlist entram — **fail-closed sempre**. O proxy (`src/proxy.ts`) só checa identidade; a layout checa a lista. Conta autenticada sem permissão é levada a `/sem-acesso`.
- **Super admin:** a **primeira conta Google que entrar no `/admin`** é promovida automaticamente a super admin (`ensureFirstAdmin` na layout). Depois disso ninguém mais é promovido. O super não pode ser removido e é o único que acessa `/admin/usuarios`. A lista mora na tabela `Admin` do Neon.
- **Next.js 16:** a proteção usa `src/proxy.ts` (o antigo `middleware.ts` está deprecado nesta versão).

## Configuração local

`.env.local` (ignorado pelo git):

```env
AUTH_SECRET=<gerado>
AUTH_GOOGLE_ID=<client id do console>
AUTH_GOOGLE_SECRET=<client secret do console>
DATABASE_URL=<pooler>
DIRECT_URL=<direta>
```

Não existem mais `SUPER_ADMIN_EMAIL`/`ADMIN_EMAILS` — a primeira conta que loga vira super admin. `.env.example` é o modelo versionado.

## Google Cloud (projeto de teste Mustache Barber)

Na tela "Criar ID do cliente do OAuth":

- Tipo: **Aplicativo da Web**
- Nome: `Maria's Store (dev)`
- Origens JavaScript autorizadas: `http://localhost:3000`
- URIs de redirecionamento autorizados:
  - `http://localhost:3000/api/auth/callback/google`
  - `http://localhost:3010/api/auth/callback/google` (porta usada nos testes locais)

Depois de criar, copiar Client ID e Client Secret para `.env.local`.

> Para produção em Vercel, trocar `localhost` pelo domínio real e adicionar a URI de callback correspondente.

## Decisão sobre e-mail

Magic link por e-mail foi **adiado**: exigiria provedor (Resend/Postmark) e domínio verificado, com custo. Como o objetivo é hobby e só o admin precisa entrar, Google sozinho atende. Reavaliar se aparecer necessidade.
