from sqlalchemy.orm import Session
from app.repositories.centro_custo_repository import centro_custo_repository
from app.schemas.centro_custo import CentroCustoCreate, CentroCustoUpdate

class CentroCustoService:
    def get_centro_custo(self, db: Session, id: int):
        return centro_custo_repository.get(db, id)

    def get_centros_custo(self, db: Session, skip: int = 0, limit: int = 100, search: str = None):
        return centro_custo_repository.get_all(db, skip=skip, limit=limit, search=search)

    def create_centro_custo(self, db: Session, obj_in: CentroCustoCreate):
        return centro_custo_repository.create(db, obj_in)

    def update_centro_custo(self, db: Session, id: int, obj_in: CentroCustoUpdate):
        db_obj = centro_custo_repository.get(db, id)
        if not db_obj:
            return None
        return centro_custo_repository.update(db, db_obj=db_obj, obj_in=obj_in)

    def delete_centro_custo(self, db: Session, id: int):
        return centro_custo_repository.delete(db, id)

centro_custo_service = CentroCustoService()
