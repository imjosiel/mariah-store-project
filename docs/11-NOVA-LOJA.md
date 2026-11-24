# 11 — Como subir uma nova loja

Este guia assume o modelo **um deploy por loja**: cada cliente tem seu próprio projeto na Vercel, banco Neon e bucket R2. O código é o mesmo; só mudam as variáveis de ambiente e o domínio.

> Vantagem: isolamento total. Um cliente nunca vê produto, pedido ou arquivo de outro. Para muitos clientes, avalie um modelo multi-tenant — não é o caso agora.

## 1. Preparar os serviços

### Neon (banco)
1. Crie um projeto Neon e um banco `neondb`.
2. Copie duas connection strings:
   - `DATABASE_URL` — host com `-pooler` e `?sslmode=require&channel_binding=require` (uso da aplicação).
   - `DIRECT_URL` — host **sem** `-pooler` (usada só pelas migrations).

### Cloudflare R2 (fotos)
1. Crie um bucket (ex.: `marias-store`).
2. Gere um token de API com permissão de leitura/escrita no bucket.
3. Anote `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
4. Configure o domínio público do bucket (R2 custom domain ou `r2.dev`) em `R2_PUBLIC_URL`, com barra final.

### Google OAuth (login do admin)
1. Crie um OAuth Client no Google Cloud.
2.URIs de redirecionamento autorizadas:
   - `https://<dominio>/api/auth/callback/google`
   - `http://localhost:3010/api/auth/callback/google` (local)
3. Anote `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`.
4. Gere o segredo com `npx auth secret` → `AUTH_SECRET`.

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
DATABASE_URL=postgresql://...-pooler.../neondb?...
DIRECT_URL=postgresql://.../neondb?...

AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=https://.../

NEXT_PUBLIC_STORE_LEGAL_NAME=
NEXT_PUBLIC_STORE_CNPJ=
NEXT_PUBLIC_STORE_ADDRESS=
NEXT_PUBLIC_STORE_EMAIL=
NEXT_PUBLIC_STORE_PHONE=
NEXT_PUBLIC_STORE_WHATSAPP=   # com DDI, só dígitos (ex.: 5554999999999)
```

> ⚠️ **Não adicione as variáveis do Asaas** se o gateway for ficar desligado. Sem `ASAAS_API_KEY` e `ASAAS_WALLET_ID`, o checkout cai automaticamente para o WhatsApp.

As mesmas variáveis devem ser cadastradas na Vercel (Project → Settings → Environment Variables).

## 3. Banco e deploy

```bash
npm install
npx prisma migrate deploy   # aplica o histórico de migrations no banco novo
npm run build
```

Na Vercel, faça o deploy do repositório. O `build` já roda `prisma generate`.

## 4. Primeiro acesso

1. Acesse `https://<dominio>/admin`.
2. Entre com a conta Google do responsável pela loja — **ela vira super admin automaticamente**.
3. Em **Administradores**, adicione outras contas que devem ter acesso. Áreas sensíveis (Administradores e Armazenamento) continuam visíveis só ao super admin.

## 5. Configurar a loja

1. **Categorias** (`/admin/categorias`): crie as categorias da loja. O slug é sugerido pelo nome e pode ser ajustado.
2. **Produtos** (`/admin/produtos/novo`): cadastre peça, cor, imagem e estoque. Dá para adicionar várias cores de uma vez.
   - A imagem é recortada no navegador e vai para o R2.
   - A cor da amostra sugere a atmosfera da peça; os pickers podem ser ajustados.
3. **Identidade e políticas**: preencha as `NEXT_PUBLIC_STORE_*`. A página `/politicas` usa esses dados (decreto 7.962/2013).
4. **Armazenamento** (`/admin/armazenamento`): confira a cota padrão de 1 GB e ajuste se necessário.

## 6. Ajustes de negócio (opcional)

Em `/admin/financeiro/regras`, o super admin pode definir:

- prazo de liberação da comissão para vendas online e presenciais;
- alíquota da comissão;
- formas de pagamento do checkout (Pix gateway e/ou WhatsApp) e a preferencial.

Padrões: WhatsApp ligado, Pix desligado, preferencial WhatsApp — a loja funciona sem gateway.

## 7. Se quiser ativar o Pix com split

1. Crie uma chave de API no Asaas e anote o `walletId` da conta que receberá a comissão.
2. Preencha no ambiente (local e Vercel):
   ```env
   ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3   # use sandbox primeiro
   ASAAS_API_KEY=
   ASAAS_WALLET_ID=
   ASAAS_WEBHOOK_TOKEN=   # 32 a 255 caracteres
   ```
3. No painel do Asaas, crie o webhook:
   - URL: `https://<dominio>/api/webhooks/asaas`
   - `authToken`: igual a `ASAAS_WEBHOOK_TOKEN`
   - eventos: `PAYMENT_RECEIVED`, `PAYMENT_SPLIT_DONE`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`
4. Ative o Pix em `/admin/financeiro/regras` e faça um pedido pequeno de teste.

> O split usa `fixedValue` com a comissão em reais, nunca percentual do valor líquido. Ver `docs/07`.

## Checklist rápido

- [ ] Neon criado com `DATABASE_URL` e `DIRECT_URL`
- [ ] R2 com bucket, chaves e domínio público
- [ ] Google OAuth com as URIs de callback
- [ ] Env vars preenchidas local e na Vercel
- [ ] `prisma migrate deploy` aplicado
- [ ] Primeiro login virou super admin
- [ ] Categorias e produtos cadastrados
- [ ] Dados legais e WhatsApp preenchidos
- [ ] Gateway desligado (ou configurado e testado em sandbox)
- [ ] `npm run verify` e `npm run test:e2e` passando
