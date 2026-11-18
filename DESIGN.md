# DESIGN.md — Maria's Store

## 1. Essência & Mundo Visual
A identidade da **Maria's Store** nasce diretamente do selo original da marca (`logo.png`): delicadeza botânica em *line-art*, serifa clássica de alto contraste combinada com caligrafia fluida, moldura dupla em *rose gold* acetinado e calor acolhedor em tons de creme e café expresso.

Sobre essa base calorosa e feminina, aplicamos a linguagem cinética das três referências de movimento do projeto:
1. **Hero Showcase Orbital & Cromático** (*Fusão Conceitos 3 & 1*): A peça principal flutua em destaque sobre uma palavra editorial monumental em serifa ao fundo. Ao alternar entre peças, a próxima roupa aguarda em miniatura no canto inferior direito, orbita em diagonal até o centro nítido enquanto a anterior recua suavemente com *depth-of-field blur* para o canto superior esquerdo. Trocar a cor no seletor altera imediatamente a peça real e tinge toda a atmosfera cromática da tela com tons terrosos/pastéis sofisticados da própria roupa.
2. **Catálogo Editorial Contínuo** (*Conceito 2*): Navegação lateral tipográfica limpa por categorias (*Todas, Casacos, Alfaiataria, Vestidos, Tricot, Bolsas*) e alternância contínua (`layoutId`) entre três modos sem quebra visual:
   - **Modo Passarela (Carrossel 3D com Blur):** Peça central em foco absoluto ladeada pelas peças vizinhas em segundo plano desfocado.
   - **Modo Grade (Editorial Grid):** Visão panorâmica limpa com micro-elevação e troca rápida de cor nos cards.
   - **Página/Vista de Detalhe da Peça:** Transição *shared-element* da roupa selecionada para inspeção detalhada, seletor de cores reais, grade de tamanhos (`PP–GG` / `36–42`), guia de medidas e *accordions* informativos (*Composição & Caimento*, *Envio & Troca Fácil*, *Avaliações*).

---

## 2. Paleta de Cores & Atmosferas Dinâmicas

Nunca usamos cinzas neutros frios (`#808080` ou `slate`) nem cores neon saturadas. Toda superfície secundária e texto de apoio são tonalizados a partir do par **Creme Amanteigado** e **Café Expresso**.

### Tokens Base (Identidade `logo.png`)
| Token | Hex | Uso |
|---|---|---|
| `--bg-cream` | `#FAF3EB` | Fundo principal editorial claro (off-white quente da logo) |
| `--bg-sand` | `#F1E4D5` | Superfícies sutis, cards em repouso e divisórias suaves |
| `--bg-latte` | `#E4D0BC` | Bordas orgânicas, estados selecionados sutis e pílulas |
| `--ink-espresso` | `#3B2316` | Texto primário, títulos e traço botânico (contraste > 11:1 sobre creme) |
| `--ink-mocha` | `#6E4B3A` | Texto secundário tonalizado (nunca cinza puro) |
| `--ink-muted` | `#9A7865` | Metadados, preços riscados e estados inativos |
| `--accent-rosegold` | `#C58F70` | Molduras duplas, detalhes de destaque, indicadores ativos e foco |
| `--accent-copper` | `#A86F50` | Hover de acento e selos promocionais sutis |

### Atmosferas Cromáticas do Hero (Por Peça / Variação)
Cada variação de cor do catálogo define um trio harmônico (`atmosphereBg`, `atmosphereGlow`, `atmosphereInk`) que mantém contraste WCAG AA (≥ 4.5:1) e preserva a sofisticação feminina:
- **Vinho Rosé (Berry):** Fundo `#4A202A` · Glow central `#7A3B4B` · Texto `#FAF0ED`
- **Mocha Expresso:** Fundo `#36241C` · Glow central `#5E4134` · Texto `#FAF3EB`
- **Pérola Quente:** Fundo `#EFE5D8` · Glow central `#FFFDF9` · Texto `#3B2316`
- **Terracota Suave:** Fundo `#7D4432` · Glow central `#A8624C` · Texto `#FAF3EB`
- **Verde Sálvia:** Fundo `#354439` · Glow central `#566B5B` · Texto `#F4F7F4`
- **Champagne Rosé:** Fundo `#EAD6CA` · Glow central `#FFF8F3` · Texto `#3B2316`

---

## 3. Tipografia
- **Display & Títulos (`--font-serif` — *Cormorant Garamond*):** Serifa clássica de alto contraste que espelha fielmente o *"Maria's"* da logo. Usada nos títulos principais, na palavra monumental atrás da peça no Hero e nas categorias editoriais em *outline/fill*.
- **Assinatura Cursiva (`--font-script` — *Alex Brush* / *Allura*):** Reservada exclusivamente para o lockup da marca (*Store*) e detalhes pontuais de assinatura, sem uso em parágrafos ou botões.
- **Interface, Corpo & Preços (`--font-sans` — *Plus Jakarta Sans*):** Leitura cristalina em tamanhos pequenos, botões, seletores de numeração e *accordions*, sempre com `font-variant-numeric: tabular-nums` em valores monetários (`R$ 289,00`).

---

## 4. Diretrizes de Craft & Motion (Guardrails)
- **Recortes Reais (Alpha Matte):** Todas as peças flutuantes utilizam `.png`/`.webp` com transparência real sem halo branco e sombra elíptica independente no piso (`blur` suave + deslocamento vertical), nunca máscaras geométricas artificiais.
- **Física Orgânica:** Animações orbitais e transições `layoutId` usam curvas *spring* amortecidas (`stiffness: 220, damping: 28`), combinando `transform`, `opacity` e `filter: blur()` para sensação real de profundidade óptica. Respeito integral a `prefers-reduced-motion`.
- **Sem Clichês de Template:** Sem *eyebrows/kickers* genéricos acima de todo título, sem texto com gradiente artificial, sem emojis no lugar de ícones vetoriais consistentes e sem sombras duras chapadas.
- **Superfícies do Navegador:** `::selection` em *rose gold* translúcido, barra de rolagem discreta em tom latte, anéis de `:focus-visible` nítidos em `--accent-rosegold` e alvos de toque mínimos de `44x44px` no mobile.
