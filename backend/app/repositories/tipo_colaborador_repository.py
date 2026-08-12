from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Tuple, Optional
from datetime import datetime
from app.models.tipo_colaborador import TipoColaborador
from app.schemas.tipo_colaborador import TipoColaboradorCreate, TipoColaboradorUpdate

class TipoColaboradorRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, idTipoColaborador: int) -> Optional[TipoColaborador]:
        return self.db.query(TipoColaborador).filter(TipoColaborador.idTipoColaborador == idTipoColaborador).first()

    def get_by_nome(self, nome: str) -> Optional[TipoColaborador]:
        return self.db.query(TipoColaborador).filter(TipoColaborador.nome == nome).first()

    def get_all(self, skip: int = 0, limit: int = 20) -> Tuple[List[TipoColaborador], int]:
        total = self.db.query(func.count(TipoColaborador.idTipoColaborador)).scalar()
        items = self.db.query(TipoColaborador).offset(skip).limit(limit).all()
        return items, total

    def create(self, tipo_in: TipoColaboradorCreate) -> TipoColaborador:
        db_obj = TipoColaborador(**tipo_in.model_dump(exclude_unset=True))
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: TipoColaborador, tipo_in: TipoColaboradorUpdate) -> TipoColaborador:
        update_data = tipo_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        # update updatedAte
        db_obj.updatedAte = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, db_obj: TipoColaborador) -> None:
        self.db.delete(db_obj)
        self.db.commit()
