from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.cargo_colaborador import CargoColaboradorResponse, CargoColaboradorCreate, CargoColaboradorUpdate, CargoColaboradorPaginatedResponse
from app.services.cargo_colaborador_service import CargoColaboradorService

router = APIRouter()

def get_service(db: Session = Depends(get_db)):
    return CargoColaboradorService(db)

@router.get("", response_model=CargoColaboradorPaginatedResponse)
def list_cargos_colaboradores(
    page: int = 1,
    page_size: int = 20,
    service: CargoColaboradorService = Depends(get_service)
):
    return service.get_cargos_colaboradores(page=page, page_size=page_size)

@router.post("", response_model=CargoColaboradorResponse, status_code=status.HTTP_201_CREATED)
def create_cargo_colaborador(
    cargo_in: CargoColaboradorCreate,
    service: CargoColaboradorService = Depends(get_service)
):
    return service.create_cargo_colaborador(cargo_in)

@router.get("/{id}", response_model=CargoColaboradorResponse)
def get_cargo_colaborador(
    id: int,
    service: CargoColaboradorService = Depends(get_service)
):
    return service.get_cargo_colaborador(id)

@router.put("/{id}", response_model=CargoColaboradorResponse)
def update_cargo_colaborador(
    id: int,
    cargo_in: CargoColaboradorUpdate,
    service: CargoColaboradorService = Depends(get_service)
):
    return service.update_cargo_colaborador(id, cargo_in)

@router.patch("/{id}", response_model=CargoColaboradorResponse)
def patch_cargo_colaborador(
    id: int,
    cargo_in: CargoColaboradorUpdate,
    service: CargoColaboradorService = Depends(get_service)
):
    return service.update_cargo_colaborador(id, cargo_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cargo_colaborador(
    id: int,
    service: CargoColaboradorService = Depends(get_service)
):
    service.delete_cargo_colaborador(id)
