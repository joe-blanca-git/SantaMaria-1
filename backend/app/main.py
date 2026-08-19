from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SantaMaria API",
    description="API REST para gestão do ERP SantaMaria.",
    version="1.0.0",
)

# Configuração de CORS (permitir todos os origens por padrão para desenvolvimento)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
def root():
    return {"message": "SantaMaria API is running. Acesso a documentação em /docs"}

from app.routers import categorias, empresas, cargos_colaboradores, colaboradores, centros_custo, unidades, importacoes

app.include_router(categorias.router, prefix="/api/v1/categorias", tags=["Categorias"])
app.include_router(empresas.router, prefix="/api/v1/empresas", tags=["Empresas"])
app.include_router(cargos_colaboradores.router, prefix="/api/v1/cargos-colaboradores", tags=["Cargos de Colaboradores"])
app.include_router(colaboradores.router, prefix="/api/v1/colaboradores", tags=["Colaboradores"])
app.include_router(centros_custo.router, prefix="/api/v1/centros-custo", tags=["Centros de Custo"])
app.include_router(unidades.router, prefix="/api/v1/unidades", tags=["Unidades"])
app.include_router(importacoes.router, prefix="/api/v1/importacoes", tags=["Importações"])
