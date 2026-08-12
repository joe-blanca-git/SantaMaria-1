import math
from app.repositories.importacao_repository import ImportacaoRepository
from app.schemas.importacao import ImportacaoPaginatedResponse
from sqlalchemy.orm import Session

class ImportacaoService:
    def __init__(self, db: Session):
        self.repository = ImportacaoRepository(db)

    def listar_importacoes(self, page: int = 1, size: int = 10, search: str = None) -> ImportacaoPaginatedResponse:
        items, total = self.repository.get_all(page=page, size=size, search=search)
        total_pages = math.ceil(total / size) if size > 0 else 1
        
        return ImportacaoPaginatedResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            total_pages=total_pages
        )
