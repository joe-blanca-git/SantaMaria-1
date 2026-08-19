from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.empresa import EmpresaResponse, EmpresaCreate, EmpresaUpdate, EmpresaPaginatedResponse
from app.services.empresa_service import EmpresaService

router = APIRouter()

def get_service(db: Session = Depends(get_db)):
    return EmpresaService(db)

from typing import Optional

@router.get("", response_model=EmpresaPaginatedResponse)
def list_empresas(
    page: int = 1,
    page_size: int = 20,
    q: Optional[str] = None,
    service: EmpresaService = Depends(get_service)
):
    return service.get_empresas(page=page, page_size=page_size, search=q)

@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
def create_empresa(
    empresa_in: EmpresaCreate,
    service: EmpresaService = Depends(get_service)
):
    return service.create_empresa(empresa_in)

@router.get("/{id}", response_model=EmpresaResponse)
def get_empresa(
    id: int,
    service: EmpresaService = Depends(get_service)
):
    return service.get_empresa(id)

@router.put("/{id}", response_model=EmpresaResponse)
def update_empresa(
    id: int,
    empresa_in: EmpresaUpdate,
    service: EmpresaService = Depends(get_service)
):
    return service.update_empresa(id, empresa_in)

@router.patch("/{id}", response_model=EmpresaResponse)
def patch_empresa(
    id: int,
    empresa_in: EmpresaUpdate,
    service: EmpresaService = Depends(get_service)
):
    return service.update_empresa(id, empresa_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_empresa(
    id: int,
    service: EmpresaService = Depends(get_service)
):
    service.delete_empresa(id)
