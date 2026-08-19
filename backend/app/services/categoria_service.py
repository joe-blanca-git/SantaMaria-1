from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.categoria_repository import CategoriaRepository
from app.schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaPaginatedResponse

class CategoriaService:
    def __init__(self, db: Session):
        self.repository = CategoriaRepository(db)

    def get_categoria(self, categoria_id: int):
        categoria = self.repository.get_by_id(categoria_id)
        if not categoria:
            raise HTTPException(status_code=404, detail="Categoria não encontrada.")
        return categoria

    def get_categorias(self, page: int = 1, page_size: int = 20, search: str = None) -> CategoriaPaginatedResponse:
        if page < 1:
            page = 1
        if page_size > 2000:
            page_size = 2000
            
        skip = (page - 1) * page_size
        items, total = self.repository.get_all(skip=skip, limit=page_size, search=search)
        
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        
        return CategoriaPaginatedResponse(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages
        )

    def create_categoria(self, categoria_in: CategoriaCreate):
        return self.repository.create(categoria_in)

    def update_categoria(self, categoria_id: int, categoria_in: CategoriaUpdate):
        db_obj = self.get_categoria(categoria_id)
        return self.repository.update(db_obj, categoria_in)

    def delete_categoria(self, categoria_id: int):
        db_obj = self.get_categoria(categoria_id)
        self.repository.delete(db_obj)
