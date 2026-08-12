from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.tipo_colaborador_repository import TipoColaboradorRepository
from app.schemas.tipo_colaborador import TipoColaboradorCreate, TipoColaboradorUpdate, TipoColaboradorPaginatedResponse

class TipoColaboradorService:
    def __init__(self, db: Session):
        self.repository = TipoColaboradorRepository(db)

    def get_tipo_colaborador(self, tipo_id: int):
        tipo = self.repository.get_by_id(tipo_id)
        if not tipo:
            raise HTTPException(status_code=404, detail="Tipo de colaborador não encontrado.")
        return tipo

    def get_tipos_colaboradores(self, page: int = 1, page_size: int = 20):
        if page < 1:
            page = 1
        if page_size > 100:
            page_size = 100
            
        skip = (page - 1) * page_size
        items, total = self.repository.get_all(skip=skip, limit=page_size)
        
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        
        return TipoColaboradorPaginatedResponse(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages
        )

    def create_tipo_colaborador(self, tipo_in: TipoColaboradorCreate):
        return self.repository.create(tipo_in)

    def update_tipo_colaborador(self, tipo_id: int, tipo_in: TipoColaboradorUpdate):
        db_obj = self.get_tipo_colaborador(tipo_id)
        return self.repository.update(db_obj, tipo_in)

    def delete_tipo_colaborador(self, tipo_id: int):
        db_obj = self.get_tipo_colaborador(tipo_id)
        self.repository.delete(db_obj)
