from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, cast, String
from app.models.centro_custo import CentroCusto, CentroEstado
from app.schemas.centro_custo import CentroCustoCreate, CentroCustoUpdate

class CentroCustoRepository:
    def get(self, db: Session, id: int):
        return db.query(CentroCusto).options(joinedload(CentroCusto.centro_estados)).filter(CentroCusto.idCentroCusto == id).first()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100, search: str = None):
        query = db.query(CentroCusto)
        if search:
            query = query.filter(
                or_(
                    CentroCusto.nome.ilike(f"%{search}%"),
                    cast(CentroCusto.codigo, String).ilike(f"%{search}%")
                )
            )
        total = query.count()
        items = query.options(joinedload(CentroCusto.centro_estados)).offset(skip).limit(limit).all()
        return items, total

    def get_by_codigo(self, db: Session, codigo: int):
        return db.query(CentroCusto).filter(CentroCusto.codigo == codigo).first()

    def create(self, db: Session, obj_in: CentroCustoCreate):
        db_obj = CentroCusto(codigo=obj_in.codigo, nome=obj_in.nome)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Inserir estados
        if obj_in.estados:
            for estado in obj_in.estados:
                ce = CentroEstado(idCentroCusto=db_obj.idCentroCusto, estado=estado)
                db.add(ce)
            db.commit()
            db.refresh(db_obj)
            
        return db_obj

    def update(self, db: Session, db_obj: CentroCusto, obj_in: CentroCustoUpdate):
        db_obj.codigo = obj_in.codigo
        db_obj.nome = obj_in.nome
        
        # Remover estados antigos
        db.query(CentroEstado).filter(CentroEstado.idCentroCusto == db_obj.idCentroCusto).delete()
        
        # Inserir novos estados
        if obj_in.estados:
            for estado in obj_in.estados:
                ce = CentroEstado(idCentroCusto=db_obj.idCentroCusto, estado=estado)
                db.add(ce)
                
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int):
        db_obj = self.get(db, id)
        if db_obj:
            # Cascade rules on relationship will handle delete, but let's be explicit
            db.query(CentroEstado).filter(CentroEstado.idCentroCusto == id).delete()
            db.delete(db_obj)
            db.commit()
        return db_obj

centro_custo_repository = CentroCustoRepository()
