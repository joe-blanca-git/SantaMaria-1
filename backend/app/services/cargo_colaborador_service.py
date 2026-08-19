from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.cargo_colaborador_repository import CargoColaboradorRepository
from app.schemas.cargo_colaborador import CargoColaboradorCreate, CargoColaboradorUpdate, CargoColaboradorPaginatedResponse

class CargoColaboradorService:
    def __init__(self, db: Session):
        self.repository = CargoColaboradorRepository(db)

    def get_cargo_colaborador(self, cargo_id: int):
        cargo = self.repository.get_by_id(cargo_id)
        if not cargo:
            raise HTTPException(status_code=404, detail="Cargo de colaborador não encontrado.")
        return cargo

    def get_cargos_colaboradores(self, page: int = 1, page_size: int = 20):
        if page < 1:
            page = 1
        if page_size > 100:
            page_size = 100
            
        skip = (page - 1) * page_size
        items, total = self.repository.get_all(skip=skip, limit=page_size)
        
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        
        return CargoColaboradorPaginatedResponse(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages
        )

    def create_cargo_colaborador(self, cargo_in: CargoColaboradorCreate):
        return self.repository.create(cargo_in)

    def update_cargo_colaborador(self, cargo_id: int, cargo_in: CargoColaboradorUpdate):
        db_obj = self.get_cargo_colaborador(cargo_id)
        return self.repository.update(db_obj, cargo_in)

    def delete_cargo_colaborador(self, cargo_id: int):
        db_obj = self.get_cargo_colaborador(cargo_id)
        self.repository.delete(db_obj)
