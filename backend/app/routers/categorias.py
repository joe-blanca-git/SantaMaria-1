from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.categoria import CategoriaResponse, CategoriaCreate, CategoriaUpdate, CategoriaPaginatedResponse
from app.services.categoria_service import CategoriaService

router = APIRouter()

def get_service(db: Session = Depends(get_db)):
    return CategoriaService(db)

@router.get("", response_model=CategoriaPaginatedResponse)
def list_categorias(
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    service: CategoriaService = Depends(get_service)
):
    return service.get_categorias(page=page, page_size=page_size, search=search)

@router.post("", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
def create_categoria(
    categoria_in: CategoriaCreate,
    service: CategoriaService = Depends(get_service)
):
    return service.create_categoria(categoria_in)

@router.get("/{id}", response_model=CategoriaResponse)
def get_categoria(
    id: int,
    service: CategoriaService = Depends(get_service)
):
    return service.get_categoria(id)

@router.put("/{id}", response_model=CategoriaResponse)
def update_categoria(
    id: int,
    categoria_in: CategoriaUpdate,
    service: CategoriaService = Depends(get_service)
):
    return service.update_categoria(id, categoria_in)

@router.patch("/{id}", response_model=CategoriaResponse)
def patch_categoria(
    id: int,
    categoria_in: CategoriaUpdate,
    service: CategoriaService = Depends(get_service)
):
    return service.update_categoria(id, categoria_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_categoria(
    id: int,
    service: CategoriaService = Depends(get_service)
):
    service.delete_categoria(id)
