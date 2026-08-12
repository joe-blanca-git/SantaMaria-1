from sqlalchemy.orm import Session
from app.repositories.unidade_repository import unidade_repository
from app.schemas.unidade import UnidadeCreate, UnidadeUpdate

class UnidadeService:
    def get_unidade(self, db: Session, id: int):
        return unidade_repository.get(db, id)

    def get_unidades(self, db: Session, skip: int = 0, limit: int = 100, search: str = None):
        return unidade_repository.get_all(db, skip=skip, limit=limit, search=search)

    def create_unidade(self, db: Session, obj_in: UnidadeCreate):
        return unidade_repository.create(db, obj_in)

    def update_unidade(self, db: Session, id: int, obj_in: UnidadeUpdate):
        db_obj = unidade_repository.get(db, id)
        if not db_obj:
            return None
        return unidade_repository.update(db, db_obj=db_obj, obj_in=obj_in)

    def delete_unidade(self, db: Session, id: int):
        return unidade_repository.delete(db, id)

unidade_service = UnidadeService()
