from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.empresa_repository import EmpresaRepository
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate, EmpresaPaginatedResponse

class EmpresaService:
    def __init__(self, db: Session):
        self.repository = EmpresaRepository(db)

    def get_empresa(self, empresa_id: int):
        empresa = self.repository.get_by_id(empresa_id)
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        return empresa

    def get_empresas(self, page: int = 1, page_size: int = 20, search: str = None):
        if page < 1:
            page = 1
        if page_size > 2000:
            page_size = 2000
            
        skip = (page - 1) * page_size
        items, total = self.repository.get_all(skip=skip, limit=page_size, search=search)
        
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        
        return EmpresaPaginatedResponse(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages
        )

    def create_empresa(self, empresa_in: EmpresaCreate):
        return self.repository.create(empresa_in)

    def update_empresa(self, empresa_id: int, empresa_in: EmpresaUpdate):
        db_obj = self.get_empresa(empresa_id)
        return self.repository.update(db_obj, empresa_in)

    def delete_empresa(self, empresa_id: int):
        db_obj = self.get_empresa(empresa_id)
        self.repository.delete(db_obj)
