# SantaMaria ERP - API REST

API REST desenvolvida em Python 3 com FastAPI para o backend do ERP SantaMaria: cadastros base (empresas, colaboradores, centros de custo, etc.), importação/streaming de planilhas Excel e reconciliação de faturas de clientes/parceiros com apoio de IA generativa (Google Gemini).

## Requisitos

- Python 3.10 ou superior
- MySQL 8.0.46
- `pip` e `venv`

## Instalação

1. Clone o repositório ou navegue até a pasta `backend`.
2. Crie e ative um ambiente virtual:
   ```bash
   python -m venv venv
   # No Windows:
   venv\Scripts\activate
   # No Linux/Mac:
   source venv/bin/activate
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

## Configuração do .env

Copie o arquivo `.env.example` para `.env` na raiz do diretório `backend` e preencha as variáveis:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=stamariabd
DATABASE_USER=seu_usuario
DATABASE_PASSWORD=sua_senha

# IA Config
GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-3.5-flash-lite
```

*Nota: O banco de dados já deve existir conforme a estrutura de tabelas definida em `databse/`. Não há Alembic/migrações — o schema é gerenciado manualmente.*

`GEMINI_API_KEY` é obrigatório apenas para os endpoints de IA (`/importacoes/ia/*` e `/importacoes/plano-saude/sorriso/*`); sem ele, essas rotas retornam erro explícito, mas o restante da API funciona normalmente. `GEMINI_MODEL` é opcional (default `gemini-3.5-flash-lite`).

## Como Executar a API

Com o ambiente virtual ativado e as variáveis configuradas, execute:

```bash
uvicorn app.main:app --reload
```

A API estará rodando em `http://127.0.0.1:8000`.

## Documentação e Swagger

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

## Endpoints Disponíveis

Todos os endpoints seguem o prefixo `/api/v1/`. Os cadastros base seguem CRUD padrão (`GET` lista paginada, `POST`, `GET/{id}`, `PUT/{id}`, `DELETE/{id}`, e `PATCH/{id}` na maioria):

- `/categorias`, `/empresas`, `/cargos-colaboradores`, `/unidades`, `/centros-custo`
- `/colaboradores` — CRUD padrão + `POST /upload`: recebe uma planilha Excel (aba "Pessoas"), cria vínculos ausentes (Centro de Custo/Cargo) automaticamente e retorna o progresso via **streaming NDJSON**.
- `/importacoes` — não é um CRUD simples; concentra:
  - `GET /` — histórico de importações.
  - `POST /ia/analise-extrato` + `POST /ia/salvar` — extração de despesas de um extrato/fatura (PDF) via Gemini, com revisão manual antes de salvar.
  - `GET /dashboard` e `GET /dashboard/analitico` — agregações para os dashboards do módulo de Despesas de Viagens.
  - Um conjunto de rotas de reconciliação específicas por cliente/parceiro (extração e conciliação de composições/prorrogações): `atacadao`, `sendas`, `martminas`, `savegnago`, `mateus`, `drogaraia`, `cema`.
  - `/conciliacao-pagamentos/*` — leitura de planilha APB e cruzamento com extratos bancários.
  - `/plano-saude/sorriso/*` e `/plano-saude/unimed-odonto/*` — extração (IA para Sorriso, regex/`pypdf` para Unimed Odonto), confirmação e exportação de dados de plano de saúde.

Consulte o Swagger para o contrato completo (schemas de request/response) de cada rota.

## Estrutura do Projeto (Service Layer + Repository Pattern)

```text
backend/app/
├── core/           # Configuração (config.py, database.py)
├── models/         # Entidades SQLAlchemy (tabelas do banco)
├── schemas/        # Contratos Pydantic (request/response)
├── repositories/   # Isola as queries/persistência
├── services/       # Regras de negócio, integrações (dashboard_service.py, ia_service.py)
└── routers/        # Endpoints FastAPI
```

Fluxo de dados: `Requisição HTTP → Router → Schema (Pydantic) → Service → Repository → Model (SQLAlchemy) → MySQL`.

### Modelo de domínio (resumo)

- **Empresa** ↔ **Modulo** (via `EmpresaModulo`): controla quais módulos do ERP cada empresa tem habilitado.
- **Colaborador**: referencia `CargoColaborador`, `CentroCusto` (que por sua vez possui N `CentroEstado`) e opcionalmente `Unidade`.
- **ColaboradorAlias**: mapeia nomes divergentes/abreviados (encontrados em extratos processados por IA) para um `Colaborador` real, evitando duplicidade por erro de digitação/OCR.
- **Movimentacao**: lançamento financeiro individual, sempre vinculado a uma `Importacao` (o lote/arquivo que o originou), e referenciando `Categoria`, `Colaborador` e `Empresa`.

## Integração com IA (Google Gemini)

`app/services/ia_service.py` centraliza o uso do SDK `google-genai`:

- Injeta no prompt as listas reais de categorias/colaboradores cadastrados no banco, forçando a IA a classificar despesas contra chaves que realmente existem no sistema (mitigação de alucinação).
- Usa `response_schema` (Pydantic) para forçar saída estruturada em JSON.
- Possui retry automático (backoff) para erros `429` (quota) e `5xx`/indisponibilidade do serviço.
- Arquivos grandes (>15MB) são enviados via Gemini Files API; menores, inline.
- Uma das análises (Unimed Odonto) é feita sem chamar a IA — puramente por regex + `pypdf` + fuzzy matching (`difflib`).

## Segurança e Autenticação (Aviso Crítico)

> **ATENÇÃO:** A API atualmente **não possui autenticação, autorização ou JWT em nenhuma rota** — todos os endpoints (CRUD, upload, IA, exportações) são públicos. O CORS em `main.py` também é permissivo (`allow_origins=["*"]`). Implementar autenticação (ex.: Supabase Auth, já usado como placeholder no frontend) é a maior prioridade antes de qualquer exposição em produção.

Não há testes automatizados (`pytest`) neste backend no momento.
