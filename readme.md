# ERP Modular

> Plataforma ERP moderna, modular e escalável desenvolvida para centralizar e automatizar processos do dia a dia através de módulos independentes.

---

# Visão Geral

O ERP Modular nasceu com o objetivo de ser uma plataforma única para desenvolvimento de diversos módulos de negócio, permitindo que novas funcionalidades sejam adicionadas continuamente sem impactar a estrutura existente.

Diferente de sistemas desenvolvidos para resolver apenas uma necessidade específica, este projeto foi concebido como uma plataforma de longo prazo, preparada para crescer de forma organizada, mantendo alta qualidade de código, facilidade de manutenção e excelente experiência para o usuário.

A ideia principal é possuir um único sistema contendo autenticação, gerenciamento de usuários, controle de permissões, navegação padronizada e uma arquitetura capaz de suportar dezenas de módulos independentes.

Todo o desenvolvimento seguirá princípios modernos de arquitetura de software, priorizando baixo acoplamento, alta coesão e reutilização de componentes.

---

# Objetivos

* Desenvolver uma plataforma ERP modular.
* Permitir a criação de módulos independentes.
* Centralizar autenticação e gerenciamento de usuários.
* Facilitar futuras integrações com APIs externas.
* Garantir escalabilidade para crescimento contínuo do sistema.
* Padronizar componentes, layouts e fluxo de navegação.
* Manter código limpo, organizado e de fácil manutenção.

---

# Tecnologias Utilizadas

## Frontend

* Angular (última versão estável)
* Standalone Components
* Angular Signals
* Angular Router
* RxJS
* SCSS
* Angular CDK
* Font Awesome
* Angular Animations

### Características

* Mobile First
* Lazy Loading
* Typed Forms
* Control Flow (`@if`, `@for`, `@switch`)
* Change Detection OnPush
* Componentização
* Responsividade
* Estrutura preparada para PWA

---

## Backend

* Python
* FastAPI
* Uvicorn
* Pydantic

### Características

* API REST
* Documentação automática (Swagger/OpenAPI)
* Arquitetura em camadas
* Validação automática
* Programação assíncrona (Async/Await)
* Alta performance

---

## Banco de Dados

* MySQL

### Diretrizes

* UTF8MB4
* Foreign Keys
* Constraints
* Índices
* Soft Delete
* Auditoria
* Integridade referencial

Toda a regra de negócio permanecerá no banco MySQL.

---

## Autenticação

O sistema utilizará o **Supabase Authentication** exclusivamente como provedor de identidade.

Serão utilizados apenas os recursos relacionados à autenticação.

### Responsabilidades do Supabase

* Cadastro de usuários
* Login
* Logout
* Recuperação de senha
* Refresh Token
* Emissão e validação de JWT

Nenhuma informação de negócio será armazenada no Supabase.

Todos os dados do ERP permanecerão exclusivamente no MySQL.

---

# Arquitetura Geral

```
                Angular
                    │
             JWT Authentication
                    │
                    ▼
              FastAPI REST API
                    │
                    ▼
                 MySQL
```

O fluxo de autenticação será realizado entre Angular e Supabase, enquanto todas as funcionalidades do ERP serão consumidas através da API FastAPI.

---

# Princípios Arquiteturais

Todo o projeto seguirá os seguintes princípios:

* Separação de responsabilidades
* Baixo acoplamento
* Alta coesão
* Código limpo (Clean Code)
* SOLID
* DRY (Don't Repeat Yourself)
* KISS (Keep It Simple)
* Convention over Configuration
* Componentização
* Reutilização
* Escalabilidade
* Segurança
* Performance

---

# Estrutura do Backend

A API será organizada em camadas bem definidas.

```
app/

├── api/
├── core/
├── config/
├── database/
├── middlewares/
├── models/
├── repositories/
├── schemas/
├── security/
├── services/
├── utils/
├── migrations/
└── tests/
```

## Responsabilidades

### API

Recebe as requisições HTTP.

### Services

Contêm toda a regra de negócio.

### Repositories

Responsáveis pelo acesso ao banco de dados.

### Models

Representação das entidades.

### Schemas

Validação de entrada e saída utilizando Pydantic.

### Security

JWT, autenticação e autorização.

### Core

Configurações globais.

### Middlewares

Interceptação das requisições.

### Utils

Funções auxiliares reutilizáveis.

---

# Estrutura do Frontend

```
src/

├── core/
├── shared/
├── layout/
├── modules/
├── pages/
├── assets/
├── styles/
└── environments/
```

## Core

Contém toda infraestrutura utilizada apenas uma vez.

Exemplos:

* Guards
* Interceptors
* Serviços globais
* Configurações
* Constantes
* Autenticação

---

## Shared

Componentes reutilizáveis.

Exemplos:

* Botões
* Inputs
* Pipes
* Diretivas
* Utilitários
* Interfaces
* Validators

---

## Layout

Componentes estruturais do sistema.

* Header
* Sidebar
* Footer
* Breadcrumb
* Loading Global

---

## Modules

Cada módulo será completamente independente.

```
modules/

financeiro/

crm/

estoque/

juridico/

projetos/

...
```

Cada módulo possuirá sua própria estrutura:

```
pages/

components/

services/

models/

routes/
```

---

# API REST

Todas as APIs seguirão o padrão REST.

Métodos utilizados:

* GET
* POST
* PUT
* PATCH
* DELETE

Todas as respostas seguirão um padrão único para facilitar o consumo pelo frontend.

---

# Versionamento

Todas as APIs nascerão versionadas.

Exemplo:

```
/api/v1/auth

/api/v1/users

/api/v1/home
```

Isso permitirá evolução futura sem quebra de compatibilidade.

---

# Segurança

O projeto deverá seguir boas práticas de segurança.

Incluindo:

* JWT
* HTTPS
* Refresh Token
* CORS
* Rate Limit
* Sanitização
* Validação de entrada
* Tratamento global de exceções
* Proteção contra requisições inválidas

---

# Auditoria

Todas as entidades deverão estar preparadas para auditoria.

Campos previstos:

* created_at
* updated_at
* deleted_at
* created_by
* updated_by
* deleted_by

Mesmo que inicialmente alguns campos ainda não sejam utilizados.

---

# Usuários

A plataforma possuirá gerenciamento próprio de usuários.

Cada usuário poderá possuir futuramente:

* Nome
* E-mail
* Foto
* Cargo
* Status
* Módulos habilitados
* Permissões
* Último acesso
* Preferências
* Tema escolhido
* Idioma

---

# Página Inicial (Home)

A Home será o ponto central do ERP.

Ela não pertence a nenhum módulo específico.

Sua função será apresentar informações relevantes ao usuário.

Inicialmente será composta por:

* Header
* Sidebar
* Breadcrumb
* Cards
* Perfil do usuário
* Módulos disponíveis
* Últimos acessos
* Atalhos
* Área para notificações
* Área para avisos
* Área destinada a futuros dashboards

---

# Layout

O layout seguirá uma estrutura única para todo o sistema.

```
Header

Sidebar

Breadcrumb

Conteúdo

Footer
```

Características:

* Sidebar recolhível
* Totalmente responsivo
* Navegação intuitiva
* Layout consistente em todos os módulos

---

# Gerenciamento de Estado

O projeto utilizará prioritariamente **Angular Signals** para gerenciamento de estado local e compartilhado.

Bibliotecas mais complexas de gerenciamento global somente serão adotadas caso a evolução do projeto realmente justifique.

---

# Componentes Base

Todos os componentes compartilhados seguirão o mesmo padrão visual.

Exemplos:

* Button
* Input
* Select
* Checkbox
* Radio
* Card
* Modal
* Drawer
* Table
* Toast
* Confirm Dialog
* Loading
* Skeleton
* Empty State
* Error State
* Paginação

---

# Experiência do Usuário

O sistema deverá oferecer uma experiência moderna.

Características previstas:

* Skeleton Loading
* Loading Global
* Loading Local
* Feedback visual imediato
* Mensagens amigáveis
* Animações leves
* Navegação rápida
* Interface limpa
* Consistência visual

---

# Responsividade

O sistema será desenvolvido utilizando abordagem Mobile First.

Compatibilidade prevista:

* Desktop
* Notebook
* Tablet
* Smartphone

---

# Internacionalização

A arquitetura será preparada para múltiplos idiomas.

Idioma inicial:

* Português (Brasil)

Idiomas futuros:

* Inglês
* Espanhol

---

# Performance

Desde o início serão adotadas práticas para manter alto desempenho.

* Lazy Loading
* OnPush
* Signals
* TrackBy
* Paginação
* Virtual Scroll
* Compressão de recursos
* Cache quando aplicável

---

# Qualidade de Código

O projeto seguirá padrões rígidos de desenvolvimento.

* ESLint
* Prettier
* Conventional Commits
* Organização por responsabilidade
* Componentização
* Nomenclatura padronizada
* Código limpo
* Comentários apenas quando realmente necessários

---

# Testes

A arquitetura será preparada para suportar:

* Testes Unitários
* Testes de Integração
* Testes End-to-End (E2E)

Mesmo que não sejam implementados na primeira fase do projeto.

---

# Roadmap Inicial

## Fase 1 — Fundação

* Configuração do repositório
* Estrutura do Angular
* Estrutura do FastAPI
* Configuração do MySQL
* Configuração do Supabase Auth
* Definição dos padrões de desenvolvimento
* Configuração do ambiente de desenvolvimento

---

## Fase 2 — Autenticação

* Cadastro
* Login
* Logout
* Recuperação de senha
* Refresh Token
* Guards
* Interceptors

---

## Fase 3 — Plataforma Base

* Layout principal
* Header
* Sidebar
* Footer
* Breadcrumb
* Página Home
* Perfil do usuário
* Menu dinâmico
* Estrutura inicial de notificações

---

## Fase 4 — Infraestrutura para Módulos

* Estrutura para novos módulos
* Controle de permissões
* Componentes compartilhados
* Registro de módulos
* Navegação desacoplada

---

# Filosofia do Projeto

Este ERP não será apenas um sistema, mas uma plataforma em constante evolução.

Cada módulo deverá ser desenvolvido de forma independente, seguindo os mesmos padrões arquiteturais e visuais, garantindo consistência, escalabilidade e facilidade de manutenção.

Todas as decisões técnicas serão tomadas priorizando simplicidade, qualidade de código e preparação para crescimento a longo prazo, evitando soluções improvisadas e reduzindo o custo de manutenção conforme a plataforma evoluir.
