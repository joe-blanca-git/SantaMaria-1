from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Tuple, Optional
from datetime import datetime
from app.models.colaborador import Colaborador
from app.models.centro_custo import CentroCusto
from app.models.cargo_colaborador import CargoColaborador
from app.schemas.colaborador import ColaboradorCreate, ColaboradorUpdate

class ColaboradorRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, idColaborador: int) -> Optional[Colaborador]:
        # Usamos joinedload para trazer o tipo_colaborador junto sem nova query
        return self.db.query(Colaborador).options(
            joinedload(Colaborador.cargo_colaborador),
            joinedload(Colaborador.centro_custo).joinedload(CentroCusto.centro_estados),
            joinedload(Colaborador.unidade)
        ).filter(Colaborador.idColaborador == idColaborador).first()

    def get_by_nome(self, nome: str) -> Optional[Colaborador]:
        return self.db.query(Colaborador).filter(Colaborador.nome == nome).first()

    def get_all(self, skip: int = 0, limit: int = 20, search: Optional[str] = None) -> Tuple[List[Colaborador], int]:
        query = self.db.query(Colaborador).outerjoin(CentroCusto).outerjoin(CargoColaborador)
        
        if search:
            search_term = f"%{search}%"
            # Tenta converter para número se a busca for por código do centro de custo
            try:
                search_codigo = int(search)
                cc_codigo_filter = CentroCusto.codigo == search_codigo
            except ValueError:
                cc_codigo_filter = False
                
            query = query.filter(
                or_(
                    Colaborador.nome.ilike(search_term),
                    CentroCusto.nome.ilike(search_term),
                    cc_codigo_filter,
                    CargoColaborador.nome.ilike(search_term)
                )
            )

        total = query.with_entities(func.count(Colaborador.idColaborador)).scalar()
        
        items = query.options(
            joinedload(Colaborador.cargo_colaborador),
            joinedload(Colaborador.centro_custo).joinedload(CentroCusto.centro_estados),
            joinedload(Colaborador.unidade)
        ).offset(skip).limit(limit).all()
        
        return items, total

    def create(self, colab_in: ColaboradorCreate) -> Colaborador:
        db_obj = Colaborador(**colab_in.model_dump(exclude_unset=True))
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return self.get_by_id(db_obj.idColaborador)

    def update(self, db_obj: Colaborador, colab_in: ColaboradorUpdate) -> Colaborador:
        update_data = colab_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db_obj.updatedAt = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_obj)
        return self.get_by_id(db_obj.idColaborador)

    def delete(self, db_obj: Colaborador) -> None:
        self.db.delete(db_obj)
        self.db.commit()
