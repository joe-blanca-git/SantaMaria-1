from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Tuple, Optional
from datetime import datetime
from app.models.empresa import Empresa
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate

class EmpresaRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, idEmpresas: int) -> Optional[Empresa]:
        return self.db.query(Empresa).filter(Empresa.idEmpresas == idEmpresas).first()

    def get_all(self, skip: int = 0, limit: int = 20) -> Tuple[List[Empresa], int]:
        total = self.db.query(func.count(Empresa.idEmpresas)).scalar()
        items = self.db.query(Empresa).offset(skip).limit(limit).all()
        return items, total

    def create(self, empresa_in: EmpresaCreate) -> Empresa:
        db_obj = Empresa(**empresa_in.model_dump(exclude_unset=True))
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: Empresa, empresa_in: EmpresaUpdate) -> Empresa:
        update_data = empresa_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        # update updatedAte
        db_obj.updatedAte = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, db_obj: Empresa) -> None:
        self.db.delete(db_obj)
        self.db.commit()
