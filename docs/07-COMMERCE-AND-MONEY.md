# 07 — Comércio e Dinheiro

> Regra executável. Em caso de conflito com este arquivo, `PRODUCT.md`/`DESIGN.md` vencem apenas no que diz respeito à identidade visual; em matéria de dinheiro, **este arquivo é a fonte da verdade**.

## 1. Contexto

- A loja é da amiga da dona do projeto, em **São Francisco de Assis / RS**.
- **Loja física é a prioridade. Online é secundário.**
- A dona **não tem sistema nem ERP**. Por isso existe um ERP/CRM mínimo próprio (ver §6).
- Situação atual: **pessoa física, sem CNPJ, sem declarar** (confirmado em 2026-11-19). Formalização como MEI é pré-requisito para 01/2027 — ver `08-FISCAL.md`.
- O desenvolvedor (você) recebe **10% da margem bruta de cada peça vendida online**. Contrato ainda não formalizado — ver §3.

## 2. Definição canônica de margem (NÃO reabrir)

```
margemDaPeça  = preço efetivamente recebido − custo do SKU
comissão      = 10% × margemDaPeça
```

Exemplo normativo: custo R$ 50,00 + margem R$ 50,00 → venda R$ 100,00 → comissão **R$ 5,00**.

**Decisões travadas:**

| Pergunta | Resposta |
|---|---|
| Ratear aluguel/energia/loja física? | **Não.** A comissão é sobre a peça, ponto. |
| "Lucro" líquido ou margem bruta? | **Margem bruta da peça.** |
| Base de cálculo | O **valor efetivamente recebido** (preço menos descontos concedidos). Taxas de pagamento **não entram** na Fase 1 porque não há gateway — pagamento é Pix direto. Quando houver gateway, taxa será deduzida e a spec revisada. |
| Arredondamento | `Math.round(valorEmCentavos)`. Sempre em centavos, nunca `float`. |
| Frete | **Fora da base** da comissão (não é margem da peça). |

Se a peça for vendida com desconto a ponto de `margem <= 0`, a comissão é `0` — nunca negativa.

## 3. Contrato (ainda a escrever — bloqueante)

Antes de codificar `commissionStatus`, sentar e escrever uma página com:

1. A fórmula do §2.
2. **Quando nasce** o direito à comissão (na confirmação do pedido no admin).
3. **Quando é paga** (após o prazo de arrependimento, §4).
4. **O que acontece em devolução/cancelamento** (§4).
5. Forma de repasse: Pix com recibo, enquanto não houver enquadramento do desenvolvedor. Validação posterior com contador — o dev também precisa de enquadramento para emitir recibo/NF de serviço.

> Este é o único item "humano" bloqueante. O código pode ser escrito com os valores acima enquanto o papel é formalizado.

## 4. Prazo de arrependimento (CDC art. 49)

Compra fora do estabelecimento físico (WhatsApp/site) dá **7 dias de arrependimento**. Logo, comissão não é imediatamente pagável:

```ts
type CommissionStatus = "PENDING" | "PAYABLE" | "PAID" | "REVERSED";

availableAt = confirmedAt + 7 dias;
```

- `PENDING` → `PAYABLE` automaticamente após `availableAt`, desde que o pedido não tenha sido cancelado.
- Cancelamento/devolução dentro dos 7 dias → `REVERSED`, comissão não devida.
- Cancelamento depois dos 7 dias → `PAID` permanece (regra simplificada; revisar se houver devolução por defeito).

## 5. Eventos e gatilhos

O **único** evento que move dinheiro é o botão no admin: **"Confirmar pedido MS-xxxx"**.

**Implementado:** rotas `/admin` (dashboard glass, nota fiscal por pedido, CSV), `/admin/produtos` (custo real) e `/admin/usuarios` (super admin + allowlist), protegidas por Auth.js. Pedidos, custos, estoque e admins **no Postgres** (`src/lib/orderStore.ts`, `productStore.ts`, `adminStore.ts`, `prisma.ts`); a sacola segue em `localStorage` (estado de navegador). Regras puras em `src/domain/` (`commission.ts`, `money.ts`, `report.ts`, `stock.ts`, `admin-access.ts`) com 51 testes + 6 E2E (Playwright, desktop e mobile: sacola → pedido no banco, API de estoque, proteção do admin). Ao enviar/copiar a sacola, o pedido é registrado com `MS-xxxx` e **congela** custo/margem daquele momento; a comissão é calculada na confirmação, que também baixa o estoque em transação. Editar o custo depois não altera pedidos antigos — é intencional. Detalhes em `docs/10-DATABASE.md`.

> **Decisão registrada:** WhatsApp Cloud API / Coexistence foi avaliada e **descartada**. É tecnicamente possível ler as mensagens do chat (inclusive as que a dona envia pelo app, via `external_app_message`), mas isso não comprova pagamento — apenas registra uma afirmação. O valor da venda já é conhecido pelo `subtotalInCents` antes do WhatsApp entrar; o que falta é só a confirmação, e um clique resolve. Custo de setup (elegibilidade, verificação, webhook, LGPD) não se justifica neste volume. Reavaliar se o volume passar de ~1.000 mensagens/mês ou se entrar gateway com webhook de Pix.

```
SENT_TO_WHATSAPP  --[admin: confirmar]-->  CONFIRMED
   • baixa estoque (atômico, uma vez só)
   • calcula e grava comissão (PENDING + availableAt)
   • gera código MS-xxxx (se ainda não houver) — NUNCA derivar do subtotal

CONFIRMED  --[+7 dias, sem cancelamento]-->  PAYABLE (comissão)
CONFIRMED  --[admin: marcar enviado]-->  SHIPPED
SHIPPED    --[admin: marcar entregue]-->  DELIVERED
qualquer, exceto DELIVERED/CANCELLED --[admin: cancelar]--> CANCELLED
```

**Bug corrigido:** o código `MS-xxxx` era derivado do subtotal; hoje `getOrderCode()` (`src/lib/bagStore.ts`) gera um código aleatório no nascimento da sacola e o persiste, antes do pedido existir no banco.

**Idempotência é obrigatória:** confirmar o mesmo pedido duas vezes não pode baixar estoque duas vezes nem duplicar comissão. Cancelar duas vezes não pode estornar estoque duas vezes (`stockRestoredAt`). Pedido cancelado **nunca** volta a `CONFIRMED` — as regras puras estão em `src/domain/order-status.ts`.

**Cancelamento:** registra `cancelledAt` e `cancelReason` (motivo opcional digitado no admin). Se o pedido já havia sido confirmado, o estoque é devolvido na mesma transação e `stockRestoredAt` guarda a idempotência. A comissão vira `REVERSED`, **exceto se já estiver `PAID`** — não se reverte um repasse já feito (§4). Pedido entregue não pode ser cancelado. A tela também permite marcar **enviado** e **entregue**, com data registrada em cada transição.

## 5.1 Origem da venda, pagamento e eventos financeiros

Toda venda tem `SaleChannel` (`ONLINE` ou `LOJA`) e, opcionalmente, `PaymentMethod`
(`PIX`, `DINHEIRO`, `CARTAO`, `GATEWAY`, `OUTRO`). Pedidos antigos ficaram `ONLINE`.
A origem existe porque a regra de arrependimento de 7 dias é só para venda fora do
estabelecimento — a loja física não tem esse prazo legal, embora possa aceitar troca
por cortesia (decisão da dona, registrada caso a caso, sem regra automática de prazo).

**Configuração no painel:** o super admin ajusta em `/admin/financeiro/regras` o prazo de
liberação por origem (`onlineGraceDays`, `storeGraceDays` — 0 = libera na hora) e a alíquota
(`commissionBps`). Os padrões são 7 dias para ambos e 10%. Pedidos antigos mantêm os valores
calculados na confirmação; as regras valem para pedidos novos. `graceDaysForChannel` e
`commissionBpsOr` (`src/domain/commission.ts`) aplicam fallback seguro. Segredos de gateway
nunca entram no painel — ficam em variáveis de ambiente.

**Pós-venda:** troca, devolução ou defeito são registrados em cada pedido (`PostSaleEvent`),
com motivo obrigatório, quem autorizou e três efeitos escolhidos na hora: devolver estoque,
estornar valor e reverter comissão. O pedido passa a `RETURNED` e cada efeito gera seu
`FinancialEvent`. Não existe prazo automático para cortesia — a dona decide caso a caso.

O PDV tem carrinho: vários itens (peça/cor/tamanho/valor recebido) entram numa única venda.
Se qualquer item não tiver estoque, a transação inteira é revertida — nenhuma baixa, nenhum
pedido. Total, custo, margem e comissão são somados sobre todos os itens.

A venda presencial entra por `/admin/pdv`: escolhe peça, cor, tamanho, quantidade, valor
efetivamente recebido (com desconto de balcão) e forma de pagamento. O pedido nasce
`CONFIRMED`, o estoque é baixado na mesma transação (nunca vende sem estoque) e um evento
`PAYMENT_RECEIVED` é registrado com a parte da loja. O desconto reduz a margem e, portanto,
a comissão — conforme §2. O repasse da comissão da loja física segue em discussão; por ora
usa-se o padrão de 7 dias.

Repasses e estornos vivem em `FinancialEvent` (`PAYMENT_RECEIVED`, `COMMISSION_PAID`,
`COMMISSION_REFUNDED`, `ORDER_REFUNDED`), com valor, taxa, parte da loja, data,
comprovante e `externalId` único para idempotência de webhook. O super admin vê o
relatório em `/admin/financeiro`; as regras de soma estão em `src/domain/financial.ts`.
Hoje os eventos são registrados manualmente. Quando entrar um gateway com split
(ex.: Asaas), os eventos passam a ser escritos por webhook e o botão "Marcar pago"
fica só para venda em dinheiro/Pix direto.

**Decisão de integração (pesquisada na doc do Asaas, 2026-11-22):** o split não pode
ser agendado — liquida no recebimento. O estorno da cobrança estorna o split
automaticamente, então devolução de venda online **deve** ser feita como estorno da
cobrança. O split percentual incide sobre `netValue` (após taxas), o que mudaria a
regra desta seção; por isso o repasse deve usar **`fixedValue`** com o valor em
centavos calculado aqui (10% da margem), nunca percentual do total. Taxas continuam
fora da base da comissão.

### Checkout com gateway (preparado, desligado por padrão)

A vitrine pode oferecer **Pix com QR Code (Asaas)** e/ou **WhatsApp (Pix manual)**.
O super admin escolhe em `/admin/financeiro/regras` quais estão ligados e qual é o preferencial.
**Defaults: Pix desligado, WhatsApp ligado, preferencial WhatsApp** — ou seja, nada muda na
vitrine até você configurar e ligar o gateway. Mesmo ligado, o Pix some se faltarem
`ASAAS_API_KEY` ou `ASAAS_WALLET_ID`. Use `ASAAS_BASE_URL` apontando para o Sandbox até homologar.

Na criação da cobrança: `billingType: PIX`, `externalReference = código MS-xxxx`, e
`split: [{ walletId, fixedValue: comissão em reais }]` — valor fixo calculado aqui, nunca
percentual do líquido. O webhook em `/api/webhooks/asaas` valida o header
`asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN`, usa o `id` do evento para idempotência e
traduz: `PAYMENT_SPLIT_DONE` → comissão paga; `PAYMENT_RECEIVED` → recebimento;
`PAYMENT_REFUNDED` / `PAYMENT_PARTIALLY_REFUNDED` → estorno da venda e do split.

Não existem subcontas nesta loja: há um único recebedor, identificado pelo `walletId`.
Subcontas são necessárias apenas no projeto de marketplace de personais (conta-pai PJ).

### Simulação de custos (congelada em 2026-11-23, catálogo real)

O gateway cobra sobre o **valor bruto da cobrança**, nunca sobre o lucro. Taxas públicas
do Asaas: Pix recebido **R$ 1,99 fixo** por transação (promocional R$ 0,99 nos 3 primeiros
meses); cartão de crédito à vista **R$ 0,49 + 2,99%**; 2–6x **3,49%**; 7–12x **3,99%**;
boleto R$ 1,99. Confirmar na tabela oficial antes de integrar.

A comissão é 10% da **margem bruta**, não do preço. Com as margens atuais do catálogo
(50% a 66% do preço), ela equivale a **~5% a ~6,6% do bruto**. Somando o gateway, o custo
combinado para o lojista fica entre **~5,5% e ~11% do bruto** — não 15% com este catálogo.

| Peça (preço / custo / margem) | Pix: gateway + comissão | Cartão 12x: gateway + comissão |
|---|---|---|
| Blazer Aurora — 389 / 195 / 194 | 1,99 + 19,40 = 21,39 (5,5%) | 16,01 + 19,40 = 35,41 (9,1%) |
| Camiseta — 399 / 135 / 264 | 1,99 + 26,40 = 28,39 (7,1%) | 16,41 + 26,40 = 42,81 (10,7%) |

A comissão **não muda** com a forma de pagamento: o gateway é custo da loja. A NF é gratuita
(NFF) e o DAS do MEI é fixo mensal (~R$ 82), sem incidência por venda — por isso não entram
nessa conta. Só entraria imposto por transação se o enquadramento mudar.

## 6. ERP/CRM mínimo (escopo)

Como não há sistema anterior para integrar, construímos o mínimo. **Não é um ERP completo.**

| Módulo | Entra | Não entra |
|---|---|---|
| Peças | cadastro com `costInCents`, `priceInCents`, variações | — |
| Estoque | `VariantStock` por cor/tamanho, baixa na confirmação | — |
| Pedidos | criar → confirmar → comissão → status | — |
| Cliente leve | nome, telefone, histórico | segmentação, automação de marketing |
| Caixa | "comissão devida a você", com status | conciliação bancária |
| Relatório | margem por peça, vendas do mês, dados para o contador | DAS, SPED, contabilidade |

**Fora de escopo, sempre:** contabilidade, DAS, SPED, emissão de NF (é manual na NFF — ver `08`), gateway de pagamento na Fase 1.

## 7. Specs em formato de teste (SDD → TDD)

A regra vira teste antes de virar código. Colocar em `tests/domain/commission.test.ts` (Vitest).

```ts
describe("calculateCommission", () => {
  it("10% da margem: custo 5000, preço 10000 → 500", () => {
    expect(calculateCommission({ cost: 5000, received: 10000 })).toBe(500);
  });

  it("desconto reduz a margem: custo 5000, preço 9000 → 400", () => {
    expect(calculateCommission({ cost: 5000, received: 9000 })).toBe(400);
  });

  it("margem negativa não gera comissão negativa", () => {
    expect(calculateCommission({ cost: 6000, received: 5000 })).toBe(0);
  });

  it("arredonda em centavos: custo 3333, preço 10000 → 667", () => {
    expect(calculateCommission({ cost: 3333, received: 10000 })).toBe(667);
  });

  it("frete não entra na base", () => {
    expect(calculateCommission({ cost: 5000, received: 10000, shipping: 2000 })).toBe(500);
  });
});

describe("confirmOrder", () => {
  it("desconto estoque exatamente uma vez", () => { /* ... */ });
  it("duas confirmações não duplicam comissão", () => { /* ... */ });
  it("availableAt = confirmedAt + 7 dias", () => { /* ... */ });
  it("cancelamento dentro de 7 dias reverte a comissão", () => { /* ... */ });
});
```

## 8. Comandos de verificação (o agente roda isso antes de dizer "pronto")

```json
"verify": "npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build"
```

Fluxo E2E crítico (Playwright): entrar → filtrar categoria → trocar cor → escolher tamanho → sacola → WhatsApp. É o fluxo de receita.
