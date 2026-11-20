# 08 — Fiscal (Rio Grande do Sul)

> **Este arquivo não é código.** Regras fiscais mudam; confirme sempre com contador antes de agir. Aqui está registrado apenas o estado atual das decisões para o agente não ficar "re-litigando" a mesma escolha a cada sessão.

## 1. Situação atual (congelada em 2026-11-19)

| Fato | Valor |
|---|---|
| Local | São Francisco de Assis, **Rio Grande do Sul** |
| Abrangência de vendas | **Somente dentro do RS** |
| Situação da dona | **Pessoa física, sem CNPJ, sem declarar** |
| Atividade | Comércio de vestuário (comprar para revender, manter estoque) |

Vender com habitualidade caracteriza contribuinte (LC 87/96 art. 4º). Pessoa física sem CNPJ nessa situação é **irregular** — não é juízo de valor, é o enquadramento legal. O caminho é formalizar como **MEI**.

## 2. Plano de formalização

| Item | Definição |
|---|---|
| Ocupação | `Comerciante de artigos do vestuário e acessórios independente` |
| CNAE | **4781-4/00** |
| Tributo | **ICMS** (estadual, SEFAZ-RS). Não é ISS — portanto **não** há NFS-e municipal. |
| DAS 2026 | ~R$ 82,05/mês (INSS + ICMS), sem mensalidade de sistema |
| Teto 2026 | R$ 81.000/ano (R$ 110k em 2027; R$ 140k em 2028 — LC 238/2026) |
| Inscrição Estadual | Automática para MEI contribuinte de ICMS no RS (Decreto 57.789/2024). Sem custo. |
| Prazo | **Antes de 01/01/2027** |

⚠️ Existe uma FAQ antiga da Sefaz-RS dizendo que MEI do SIMEI "fica impedido de possuir IE no RS". **Está desatualizada** — a regra vigente é a de 2024+. Não usar como fonte.

Com a IE, a dona deve **comprar sempre com nota fiscal de entrada** em nome do CNPJ.

## 3. Emissão de documento fiscal

**Nenhum emissor pago. Nenhuma integração com gateway de nota.**

| Momento | Regra |
|---|---|
| 2026, pessoa física (hoje) | Sem CNPJ, não há emissão própria. Manter recibos/controle interno. **Transitório.** |
| 2026, se virar MEI | MEI do SIMEI está dispensado de nota para consumidor final pessoa física; obrigatório para empresa sem IE que não emita nota de entrada (Decreto 37.699/97, Livro II, art. 44, XV). |
| 2026, se cliente pedir nota | Emitir. CDC obriga. |
| **01/01/2027 em diante** | Resolução CGSN 190/2026 obriga documento fiscal em **todas** as vendas, inclusive pessoa física. Caminho preferencial: **Nota Fiscal Fácil (NFF), gratuita**. |

Ferramentas oficiais do RS (todas gratuitas):

- **NFF** — app `Nota Fiscal Fácil`, login com conta gov.br. Emite NF-e (55) e NFC-e (65). **Recomendada.**
- **NFA-e** — emissor web em `sefaz.rs.gov.br/NFE/nfe-nfa-mei.aspx`.
- **Emissor do Sebrae** — alternativa.

### O que o app faz e o que não faz

O app **não calcula imposto** e **não emite nota**. Ele apenas registra o que aconteceu fora dele, para o relatório mensal ao contador:

```prisma
nfNumber  String?  // preenchido manualmente no admin após emitir na NFF
cfop      String   @default("5.102")
```

Na Fase 1 o campo `nfNumber` fica no cartão de cada pedido em `/admin` (salvo ao sair do campo) e entra no CSV exportado — é o relatório entregue ao contador.

CFOP para venda **interna** (dentro do RS):

- `5.101` — produção própria (se ela confeciona as peças)
- `5.102` — revenda de mercadoria adquirida de terceiros

**Confirmar com o contador qual dos dois se aplica** antes de fixar o default. Se for produção própria, trocar o default para `5.101`.

NCM: opcional no cadastro. Só é obrigatório em operação interestadual/exportação — **fora do escopo** (vendemos só no RS).

## 4. Repositórios da Receita (referência, não dependência)

Os três repositórios citados no planejamento:

| Repo | Uso aqui |
|---|---|
| `calculadora-rtc-regime-regular` | **Fora do caminho crítico.** Serviço Java/Spring separado; não roda dentro do Next/Vercel. Consultar só se o regime mudar para normal. |
| `calculadora-rtc-simples-nacional` | **Referência futura.** Regras CBS/IBS para Simples só produzem efeitos em 01/01/2027 (CGSN 191/2026). Revisitar em dezembro/2026. |
| `calculadora-rtc-gerador-danfse` | **Descartado.** Gera PDF de NFS-e (serviço). Nosso caso é ICMS (produto). Nem se aplica. |

Se um dia virar dependência, usar como **oráculo de teste** (comparar implementação própria com a API oficial), nunca no request path. Guardar `taxRulesVersion` em cada pedido. **Hoje: não implementar nada disso.**

## 5. Asaas / Stripe / WhatsApp API

| Item | Decisão | Motivo |
|---|---|---|
| Asaas com emissão de nota | **Não usar na Fase 1** | NFF é gratuita. Além disso, o emissor do Asaas é NFS-e (serviço); NF-e/NFC-e vai pelo Base by Asaas, a R$ 0,49. Sem sentido pagar. |
| Gateway de pagamento | **Não usar na Fase 1** | Pix direto é gratuito. Se um dia entrar, o evento "pago" do gateway é útil — R$ 1,99 por Pix no Asaas pode valer a automação. Reavaliar quando o volume justificar. |
| Stripe | **Não usar** | Foco é Brasil, Pix/boleto. Stripe só se vender para fora. |
| WhatsApp Cloud API | **Não usar** | `wa.me` gratuito atende. Cloud API cobra por mensagem desde 01/10/2026 (1.000 mensagens de serviço grátis/mês), exige número dedicado e webhook. Reavaliar acima de ~1k mensagens/mês. |
| Baileys / Evolution API | **Nunca** | Não oficiais; risco de banir o número da loja. |

## 6. Obrigações da loja (fora do app, mas registrar)

- CDC art. 49 — 7 dias de arrependimento em compra fora do estabelecimento (já modelado em `07`, §4).
- Decreto 7.962/2013 — a página de venda deve mostrar nome empresarial, CNPJ, endereço, despesas de entrega e prazo, e informar como exercer o arrependimento. **Quando formalizar, adicionar esses dados no rodapé do site.**
- Guardar notas de compra e venda por 5 anos.
- Relatório Mensal de Receitas Brutas (Anexo X, Resolução CGSN 140/2018) + DASN-Simei anual.

## 7. Checklist antes de marcar "fiscal pronto"

- [] Dona formalizou como MEI (CNAE 4781-4/00)
- [ ] IE ativa consultada no Cadastro Centralizado de Contribuintes
- [ ] Contador confirmou CFOP (5.101 vs 5.102)
- [ ] Contador confirmou dispensa/obrigação de nota em 2026 para o caso dela
- [ ] Dados do Decreto 7.962/2013 no rodapé do site
- [ ] `nfNumber` sendo preenchido no admin após emissão na NFF
- [ ] Revisão agendada para dezembro/2026 (CBS/IBS no Simples + NFF obrigatória)
