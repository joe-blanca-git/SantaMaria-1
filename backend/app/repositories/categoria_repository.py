from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Tuple, Optional
from datetime import datetime
from app.models.categoria import Categoria
from app.schemas.categoria import CategoriaCreate, CategoriaUpdate

class CategoriaRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, idCategorias: int) -> Optional[Categoria]:
        return self.db.query(Categoria).filter(Categoria.idCategorias == idCategorias).first()

    def get_all(self, skip: int = 0, limit: int = 20, search: str = None) -> Tuple[List[Categoria], int]:
        query = self.db.query(Categoria)
        if search:
            query = query.filter(Categoria.nome.ilike(f"%{search}%"))
            
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def create(self, categoria_in: CategoriaCreate) -> Categoria:
        db_obj = Categoria(**categoria_in.model_dump(exclude_unset=True))
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: Categoria, categoria_in: CategoriaUpdate) -> Categoria:
        update_data = categoria_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        # update updatedAte
        db_obj.updatedAte = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, db_obj: Categoria) -> None:
        self.db.delete(db_obj)
        self.db.commit()
