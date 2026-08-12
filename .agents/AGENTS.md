# Regras do Projeto SANTAMARIA

- **Build de Validação**: Sempre executar um build (`ng build`) ou validação de compilação similar e aguardar sua finalização para garantir que não há erros ANTES de encerrar uma macro-tarefa.

- **Teste de Integração (CI)**: Após a finalização de um build válido, executar os testes de integração ( Comando: `npm run cy:run` ). Aguardar a conclusão e validar os relatórios finais antes de considerar a tarefa concluída.

- **Padrões de Componentes Angular**:
  - Utilizar **Standalone Components** por padrão.
  - Priorizar **Angular Signals** para gerenciamento de estado local.
  - Utilizar a sintaxe de Control Flow do Angular (`@if`, `@for`, `@switch`).
  - Páginas e componentes devem ter arquivos de template (`.html`) e estilo (`.scss`) separados, evitando templates inline.
  - Para estilos customizados, importe as variáveis globais no SCSS: `@import 'styles/variables';`.

- **Reutilização e Componentização (Shared)**:
  - Sempre buscar componentes existentes em `shared/components/` antes de criar novos elementos visuais.
  - Componentes Padrões Disponíveis: `avatar`, `badge`, `breadcrumb`, `button`, `card`, `dropdown`, `empty-state`, `error-state`, `input`, `loading`, `modal`, `skeleton`, `tooltip`.
  - **ATENÇÃO:** Se sentir a falta de algum componente comum (ex: tables, switches, datepickers), **pergunte ao usuário** antes de criar um componente do zero ou de instalar bibliotecas externas.
  - Manter o padrão visual do ERP (Mobile First, responsividade, UI limpa).

- **Arquitetura Modular**:
  - O ERP é modular. Novos fluxos de negócio (módulos) devem ser desenvolvidos de forma independente e isolada.
  - O sistema segue princípios do SOLID, DRY e Clean Code.

- **Design System e Padrão Visual SaaS (UI Premium)**:
  - **Aparência Geral**: O sistema deve transmitir uma estética limpa, corporativa, elegante e moderna (semelhante a Stripe, Linear, Vercel). Evite a aparência de sistemas administrativos antigos. Layouts devem "respirar" e preferir a abordagem "edge-to-edge" no lugar de abrigar tudo dentro de cards pesados.
  - **Tipografia e Hierarquia**: Utilize uma escala tipográfica consistente. Títulos de página em 24px (`1.5rem`) Semibold. Títulos de seção em 16px (`1rem`) Semibold. Textos gerais e auxiliares entre 13px e 14px em tons mutados (`$gray-500` a `$gray-600`).
  - **Espaçamento**: Siga rigidamente um sistema de múltiplos de 4px ou 8px (utilizando `rem`, por exemplo `0.25rem`, `0.5rem`, `1rem`, `1.5rem`, `2rem`).
  - **Cards**: Utilize bordas muito suaves (`1px solid $border-color`), border-radius moderno (`12px`), fundo branco. Evite sombras pesadas em estado de repouso; utilize sombras levíssimas (`box-shadow: 0 4px 12px rgba(0,0,0,0.03)`) atreladas a um leve levante (`transform: translateY(-1px)`) apenas no estado de `:hover`.
  - **Tabelas (SaaS Style)**: Abolição total de bordas verticais. Cabeçalhos de tabela devem ser sutis, em tamanho reduzido (12px), maiúsculas (uppercase), com letter-spacing, usando cores como `$gray-500`. As linhas (`tr`) possuem bordas inferiores super suaves (`$gray-100`) ou fundo branco com hover que escureça levemente o fundo da linha (`rgba($gray-50, 0.5)`). Valores numéricos e financeiros alinham rigidamente à direita com `font-variant-numeric: tabular-nums`.
  - **Botões e Ações**: Evite botões grandes onde uma ação sutil basta. Botões de ação em tabelas devem ser pequenos (ex: 28x28px), sem borda ou fundo preenchido no estado inativo. Cores destrutivas (`$danger`) ou de destaque (`$primary`) devem aparecer idealmente no *hover* (com `background-color` translúcido) para não pesar o visual passivo da tela.
  - **Abas e Navegação**: Opte por abas horizontais limpas com indicador inferior (`border-bottom` de 2px) para a aba ativa, utilizando a cor `$primary`. Remova bordas desnecessárias nas abas inativas.

- **Integração de Arquivos e Streaming (APIs Assíncronas)**:
  - Para processamento de arquivos tabulares pesados (como planilhas Excel) no backend FastAPI, utilize `pandas` para leitura robusta.
  - Sempre que houver um processamento longo (como validação/importação em lote de dezenas de linhas), **não deixe o frontend pendurado no escuro**. Utilize o `StreamingResponse` do FastAPI retornando NDJSON (Newline Delimited JSON) em *chunks* (`yield`).
  - No Angular (Frontend), consuma esses endpoints de *streaming* NDJSON de forma nativa utilizando a API Web (`fetch` e `response.body.getReader()`), atualizando a UI e mostrando feedback passo-a-passo (com spinners). Evite o `HttpClient` clássico do Angular se ele não suportar o parse do *stream* nativamente sem bufferização integral.

- **Padronização de Grids e Busca**:
  - Toda grid no sistema (especialmente na área de configurações/listagem de cadastros básicos como Colaboradores, Categorias, Centros de Custo, Unidades) deve obrigatoriamente seguir o mesmo padrão de barra de busca.
  - Deve-se utilizar a estrutura HTML `<div class="config-toolbar"><div class="search-box">...</div></div>` separada do `config-header`.
  - A caixa de busca deve refletir o parâmetro para filtro em tempo real (paginação backend) conectando com variáveis como `(ngModelChange)`.
