# SantaMaria ERP - API REST

API REST desenvolvida em Python 3 usando FastAPI para gerenciamento das entidades principais do ERP SantaMaria.

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

Copie o arquivo `.env.example` para `.env` na raiz do diretório `backend` e preencha as variáveis de acesso ao seu banco de dados MySQL:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=stamariabd
DATABASE_USER=seu_usuario
DATABASE_PASSWORD=sua_senha
```

*Nota: O banco de dados já deve existir conforme a estrutura de tabelas definida no projeto.*

## Como Executar a API

Com o ambiente virtual ativado e as variáveis configuradas, execute:

```bash
uvicorn app.main:app --reload
```

A API estará rodando em `http://127.0.0.1:8000`.

## Documentação e Swagger

A documentação interativa (Swagger UI) é gerada automaticamente pelo FastAPI. Você pode acessá-la e testar os endpoints diretamente pelo navegador:

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

## Endpoints Disponíveis

Todos os endpoints seguem o prefixo `/api/v1/`:

- `/api/v1/categorias`: GET, POST, GET/{id}, PUT/{id}, PATCH/{id}, DELETE/{id}
- `/api/v1/empresas`: GET, POST, GET/{id}, PUT/{id}, PATCH/{id}, DELETE/{id}
- `/api/v1/tipos-colaboradores`: GET, POST, GET/{id}, PUT/{id}, PATCH/{id}, DELETE/{id}
- `/api/v1/colaboradores`: GET, POST, GET/{id}, PUT/{id}, PATCH/{id}, DELETE/{id}

*Nota*: Ao criar ou atualizar um Colaborador, certifique-se de que o `idTipoColaborador` fornecido existe.

## Estrutura do Projeto (Clean Architecture)

- `app/main.py`: Ponto de entrada e registro de rotas.
- `app/core/`: Configuração de ambiente e Engine do SQLAlchemy.
- `app/models/`: Modelos ORM (tabelas do banco de dados).
- `app/schemas/`: Modelos de validação do Pydantic (Request/Response).
- `app/repositories/`: Classes responsáveis pela execução das queries do SQLAlchemy, isolando a regra de persistência.
- `app/services/`: Camada de regras de negócio (validações complexas e tratamento de Foreign Keys não existentes).
- `app/routers/`: Controladores FastAPI, expondo os métodos HTTP.
