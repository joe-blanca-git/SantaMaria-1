from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Tuple, Optional
from datetime import datetime
from app.models.cargo_colaborador import CargoColaborador
from app.schemas.cargo_colaborador import CargoColaboradorCreate, CargoColaboradorUpdate

class CargoColaboradorRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, idCargoColaborador: int) -> Optional[CargoColaborador]:
        return self.db.query(CargoColaborador).filter(CargoColaborador.idCargoColaborador == idCargoColaborador).first()

    def get_by_nome(self, nome: str) -> Optional[CargoColaborador]:
        return self.db.query(CargoColaborador).filter(CargoColaborador.nome == nome).first()

    def get_all(self, skip: int = 0, limit: int = 20) -> Tuple[List[CargoColaborador], int]:
        total = self.db.query(func.count(CargoColaborador.idCargoColaborador)).scalar()
        items = self.db.query(CargoColaborador).offset(skip).limit(limit).all()
        return items, total

    def create(self, cargo_in: CargoColaboradorCreate) -> CargoColaborador:
        db_obj = CargoColaborador(**cargo_in.model_dump(exclude_unset=True))
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: CargoColaborador, cargo_in: CargoColaboradorUpdate) -> CargoColaborador:
        update_data = cargo_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        # update updatedAte
        db_obj.updatedAte = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, db_obj: CargoColaborador) -> None:
        self.db.delete(db_obj)
        self.db.commit()
