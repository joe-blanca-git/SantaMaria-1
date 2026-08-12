from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String
from app.models.unidade import Unidade
from app.schemas.unidade import UnidadeCreate, UnidadeUpdate

class UnidadeRepository:
    def get(self, db: Session, id: int):
        return db.query(Unidade).filter(Unidade.idUnidade == id).first()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100, search: str = None):
        query = db.query(Unidade)
        if search:
            query = query.filter(
                or_(
                    Unidade.descricao.ilike(f"%{search}%"),
                    cast(Unidade.codigo, String).ilike(f"%{search}%")
                )
            )
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_by_codigo(self, db: Session, codigo: int):
        return db.query(Unidade).filter(Unidade.codigo == codigo).first()

    def create(self, db: Session, obj_in: UnidadeCreate):
        db_obj = Unidade(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Unidade, obj_in: UnidadeUpdate):
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int):
        db_obj = self.get(db, id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
        return db_obj

unidade_repository = UnidadeRepository()
