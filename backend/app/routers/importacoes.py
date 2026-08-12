from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.importacao import ImportacaoPaginatedResponse
from app.services.importacao_service import ImportacaoService

router = APIRouter()

def get_service(db: Session = Depends(get_db)):
    return ImportacaoService(db)

@router.get("/", response_model=ImportacaoPaginatedResponse)
def get_importacoes(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: str = Query(None, description="Busca por nome de arquivo ou tipo"),
    service: ImportacaoService = Depends(get_service)
):
    return service.listar_importacoes(page=page, size=size, search=search)
