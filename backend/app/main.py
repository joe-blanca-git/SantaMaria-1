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

from fastapi import Depends
from app.api.deps import get_current_user
from app.routers import (
    auth, categorias, empresas, cargos_colaboradores,
    colaboradores, centros_custo, unidades, importacoes, users
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticação"])
app.include_router(categorias.router, prefix="/api/v1/categorias", tags=["Categorias"], dependencies=[Depends(get_current_user)])
app.include_router(empresas.router, prefix="/api/v1/empresas", tags=["Empresas"], dependencies=[Depends(get_current_user)])
app.include_router(cargos_colaboradores.router, prefix="/api/v1/cargos-colaboradores", tags=["Cargos de Colaboradores"], dependencies=[Depends(get_current_user)])
app.include_router(colaboradores.router, prefix="/api/v1/colaboradores", tags=["Colaboradores"], dependencies=[Depends(get_current_user)])
app.include_router(centros_custo.router, prefix="/api/v1/centros-custo", tags=["Centros de Custo"], dependencies=[Depends(get_current_user)])
app.include_router(unidades.router, prefix="/api/v1/unidades", tags=["Unidades"], dependencies=[Depends(get_current_user)])
app.include_router(importacoes.router, prefix="/api/v1/importacoes", tags=["Importações"], dependencies=[Depends(get_current_user)])
app.include_router(users.router, prefix="/api/v1/users", tags=["Usuários"], dependencies=[Depends(get_current_user)])
