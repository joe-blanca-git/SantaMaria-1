from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Tuple, Optional
from datetime import datetime
from app.models.empresa import Empresa
from app.models.empresa_modulo import EmpresaModulo
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate

class EmpresaRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, idEmpresas: int) -> Optional[Empresa]:
        return self.db.query(Empresa).filter(Empresa.idEmpresas == idEmpresas).first()

    def get_by_nome(self, nome: str) -> Optional[Empresa]:
        return self.db.query(Empresa).filter(Empresa.nome == nome).first()

    def get_all(self, skip: int = 0, limit: int = 20, search: Optional[str] = None, modulo: Optional[int] = None) -> Tuple[List[Empresa], int]:
        query = self.db.query(Empresa)
        
        if modulo is not None:
            query = query.join(EmpresaModulo, Empresa.idEmpresas == EmpresaModulo.idEmpresas).filter(EmpresaModulo.idModulos == modulo)
            
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Empresa.nome.ilike(search_term),
                    Empresa.descricao.ilike(search_term)
                )
            )
            
        total = query.with_entities(func.count(Empresa.idEmpresas)).scalar()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def create(self, empresa_in: EmpresaCreate) -> Empresa:
        data = empresa_in.model_dump(exclude_unset=True)
        modulo_id = data.pop('modulo_id', None)
        
        db_obj = Empresa(**data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        
        if modulo_id is not None:
            empresa_modulo = EmpresaModulo(idEmpresas=db_obj.idEmpresas, idModulos=modulo_id)
            self.db.add(empresa_modulo)
            self.db.commit()
            
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
        self.db.query(EmpresaModulo).filter(EmpresaModulo.idEmpresas == db_obj.idEmpresas).delete()
        self.db.delete(db_obj)
        self.db.commit()
