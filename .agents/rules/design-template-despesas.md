# Padrão de Design e Template - Visão Premium (SaaS)

Este documento define os padrões visuais, estruturais e de componentes extraídos do template "Despesas de Viagens". Este padrão deve ser estritamente seguido ao criar ou refatorar outras páginas do sistema para garantir uma experiência de usuário consistente, moderna e com estética "Premium SaaS".

## 1. Estrutura de Layout e Containers

- **Page Container (`.page-container`)**:
  - `max-width: 1400px` para não esticar excessivamente em telas ultrawide.
  - Centralizado (`margin: 0 auto`).
  - Margem superior negativa (`margin-top: -0.75rem`) para aproximação com o breadcrumb.
  - Padding inferior espaçoso (`padding-bottom: 3rem`) para respiro da página.

- **Page Header Premium (`.page-header-premium`)**:
  - Título da página (`.page-title`): `1.125rem` (18px), `font-weight: 600`, cor `$gray-800`, leve `letter-spacing: -0.01em`.
  - Descrição (`.page-description`): `0.8125rem` (13px), cor `$gray-500`, sem negrito.

- **Main Layout (`.main-layout`)**:
  - Flexbox container dividindo Sidebar de Navegação e Conteúdo Principal.
  - `gap: 2rem` (reduzido para `1.5rem` e `flex-direction: column` em mobile).

## 2. Navegação Lateral e Abas (Sidebar & Tabs)

- **Sidebar (`.main-sidebar`)**:
  - Largura fixa de `240px`, colapsável para `60px`.
  - Links (`.main-nav-link`): Sem bordas, fundo transparente, texto `$gray-600` (`font-weight: 500`).
  - **Hover**: Fundo `rgba($gray-100, 0.6)`, texto `$gray-900`.
  - **Active**: Fundo `rgba($primary, 0.08)`, texto e ícone na cor `$primary`, `font-weight: 600`.
  - Ícones com largura fixa (`20px`) para alinhamento perfeito do texto.

- **Navegação Horizontal (`.config-nav-link`)**:
  - Padrão visual idêntico ao Sidebar Active/Hover, mas dispostos horizontalmente com `gap: 0.5rem`.

## 3. Painel de Filtros (Filters Card)

- **Container (`.filters-panel-card`)**:
  - Fundo `$white`, borda `1px solid rgba($border-color, 0.8)`, `border-radius: 12px`.
  - Sombreamento ultra-leve: `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02)`.
  - Layout interno usando Flexbox (`.filters-grid`) com `gap: 1.25rem`.

- **Labels (`.filter-label`)**:
  - Tamanho `0.75rem`, `font-weight: 600`, cor `var(--color-text-muted)`.
  - `text-transform: uppercase` com `letter-spacing: 0.05em`.

- **Inputs e Selects (`.form-control`, `.form-select`)**:
  - Altura rígida de `38px`, `border-radius: 8px`.
  - Borda nativa `$border-color`, `box-shadow: 0 1px 2px rgba(0,0,0,0.02)`.
  - **Estado Focus**: Borda `rgba($primary, 0.5)`, anel de foco suave `box-shadow: 0 0 0 3px rgba($primary, 0.1)`. (Anula o outline nativo).

## 4. Cards de Indicadores (Dash Cards)

- **Container (`.dash-card`)**:
  - Fundo `$white`, `border-radius: 10px`, borda `1px solid rgba($border-color, 0.8)`.
  - Sombreamento passivo: `box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02)`.
  - **Estado Hover**: Efeito de elevação `transform: translateY(-2px)`, ampliação da sombra `box-shadow: 0 6px 12px rgba(0,0,0,0.04)`, borda `rgba($primary, 0.2)`.

- **Tipografia e Ícones do Card**:
  - Título (`.dash-card-title`): `0.65rem`, `font-weight: 600`, texto mutado, uppercase, `letter-spacing: 0.05em`.
  - Ícones (`.icon-wrapper`): Dimensão `26x26px`, arredondamento `6px`. Utilizar classes `-subtle` para os fundos combinados com o texto da respectiva cor (Ex: `bg-primary-subtle text-primary`, `bg-danger-subtle text-danger`).
  - Valor Numérico (`.dash-value`): `1.15rem`, `font-weight: 700`, `$gray-900`, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.01em`.
  - Trend Indicator (`.dash-trend`): Ícones para cima (`$danger` em despesas ou `$success` em receitas) e texto explicativo em `$gray-500`.

## 5. Gráficos e Tabelas (Containers Premium)

- **Cards de Gráficos (`.dash-chart-card`)**:
  - Fundo branco, `border-radius: 10px`, borda sutil `1px solid rgba(0, 0, 0, 0.1)`.
  - Cabeçalho com borda inferior sutil, título em `0.8rem` (Semibold, cor `#9fabbd`).

- **Tabelas Estilo SaaS (`.custom-table`, `.saas-table`)**:
  - **Thead (Cabeçalho)**: Borda inferior, sem bordas verticais. Texto `0.75rem`, `uppercase`, `letter-spacing: 0.05em`, cor `#64748b` (cinza-500), `font-weight: 600`. Fundo do thead com leve transparência `rgba(248, 250, 252, 0.5)`.
  - **Tbody (Linhas)**: Padding interno generoso (`0.85rem 1.25rem`). Cor do texto `#475569`.
  - **Linhas (tr)**: Borda inferior suave, anulada no último elemento (`tr:last-child td { border-bottom: none; }`).
  - **Hover nas Linhas**: Escurecimento leve do fundo da linha no hover (`rgba(248, 250, 252, 0.8)`).
  - Valores monetários/numéricos sempre alinhados à direita utilizando a classe `.tabular-nums` (`font-variant-numeric: tabular-nums;`).

## 6. Feedback Visual e Interatividade

- **Skeleton Loading**:
  - Sempre que dados estiverem carregando (`*ngIf="isLoading"`), renderizar a estrutura exata de esqueletos (usando `<app-skeleton>`). 
  - Skeletons devem refletir a proporção de cada card, texto de cabeçalho, tamanho de gráfico (círculo para donuts, retângulo para área) e linhas de tabelas.
- **Empty States / Seleção Nula**:
  - Em áreas de detalhe onde nenhum item foi selecionado, usar containers com borda tracejada (`border: 2px dashed rgba(226, 232, 240, 0.8)`), fundo `#f8fafc`, e ícones com baixa opacidade acompanhados de textos de orientação amenos.
- **Micro-animações**:
  - Abertura de detalhes e modais utilizando `@keyframes slideDown` (`transform: translateY(-10px)` para `0`, transição de `opacity`).
  - Suavidade universal: Todo efeito `hover` (botões, cards, linhas) utiliza `transition: all 0.2s ease`.

## 7. Ações e Botões

- Botões de ações primárias em tabelas devem ser sutis, como botões de `28x28px` transparentes.
- Cores marcantes (`$primary`, `$danger`) para estas pequenas ações surgem de forma preenchida apenas no estado de `:hover`, mantendo o visual default passivo e leve.
