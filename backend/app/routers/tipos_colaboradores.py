from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.tipo_colaborador import TipoColaboradorResponse, TipoColaboradorCreate, TipoColaboradorUpdate, TipoColaboradorPaginatedResponse
from app.services.tipo_colaborador_service import TipoColaboradorService

router = APIRouter()

def get_service(db: Session = Depends(get_db)):
    return TipoColaboradorService(db)

@router.get("", response_model=TipoColaboradorPaginatedResponse)
def list_tipos_colaboradores(
    page: int = 1,
    page_size: int = 20,
    service: TipoColaboradorService = Depends(get_service)
):
    return service.get_tipos_colaboradores(page=page, page_size=page_size)

@router.post("", response_model=TipoColaboradorResponse, status_code=status.HTTP_201_CREATED)
def create_tipo_colaborador(
    tipo_in: TipoColaboradorCreate,
    service: TipoColaboradorService = Depends(get_service)
):
    return service.create_tipo_colaborador(tipo_in)

@router.get("/{id}", response_model=TipoColaboradorResponse)
def get_tipo_colaborador(
    id: int,
    service: TipoColaboradorService = Depends(get_service)
):
    return service.get_tipo_colaborador(id)

@router.put("/{id}", response_model=TipoColaboradorResponse)
def update_tipo_colaborador(
    id: int,
    tipo_in: TipoColaboradorUpdate,
    service: TipoColaboradorService = Depends(get_service)
):
    return service.update_tipo_colaborador(id, tipo_in)

@router.patch("/{id}", response_model=TipoColaboradorResponse)
def patch_tipo_colaborador(
    id: int,
    tipo_in: TipoColaboradorUpdate,
    service: TipoColaboradorService = Depends(get_service)
):
    return service.update_tipo_colaborador(id, tipo_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tipo_colaborador(
    id: int,
    service: TipoColaboradorService = Depends(get_service)
):
    service.delete_tipo_colaborador(id)
