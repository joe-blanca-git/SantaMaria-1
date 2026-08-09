from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.colaborador_repository import ColaboradorRepository
from app.repositories.tipo_colaborador_repository import TipoColaboradorRepository
from app.schemas.colaborador import ColaboradorCreate, ColaboradorUpdate, ColaboradorPaginatedResponse

class ColaboradorService:
    def __init__(self, db: Session):
        self.repository = ColaboradorRepository(db)
        self.tipo_repo = TipoColaboradorRepository(db)

    def get_colaborador(self, colab_id: int):
        colab = self.repository.get_by_id(colab_id)
        if not colab:
            raise HTTPException(status_code=404, detail="Colaborador não encontrado.")
        return colab

    def get_colaboradores(self, page: int = 1, page_size: int = 20):
        if page < 1:
            page = 1
        if page_size > 100:
            page_size = 100
            
        skip = (page - 1) * page_size
        items, total = self.repository.get_all(skip=skip, limit=page_size)
        
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        
        return ColaboradorPaginatedResponse(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages
        )

    def _validate_fk(self, id_tipo_colaborador: int):
        if not self.tipo_repo.get_by_id(id_tipo_colaborador):
            raise HTTPException(status_code=400, detail="Tipo de colaborador informado não encontrado.")

    def create_colaborador(self, colab_in: ColaboradorCreate):
        self._validate_fk(colab_in.idTipoColaborador)
        return self.repository.create(colab_in)

    def update_colaborador(self, colab_id: int, colab_in: ColaboradorUpdate):
        db_obj = self.get_colaborador(colab_id)
        if colab_in.idTipoColaborador is not None and colab_in.idTipoColaborador != db_obj.idTipoColaborador:
            self._validate_fk(colab_in.idTipoColaborador)
            
        return self.repository.update(db_obj, colab_in)

    def delete_colaborador(self, colab_id: int):
        db_obj = self.get_colaborador(colab_id)
        self.repository.delete(db_obj)
