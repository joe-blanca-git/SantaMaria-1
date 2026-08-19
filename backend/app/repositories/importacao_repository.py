from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple
from app.models.importacao import Importacao

class ImportacaoRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, page: int = 1, size: int = 10, search: str = None) -> Tuple[List[Importacao], int]:
        query = self.db.query(Importacao)
        
        if search:
            query = query.filter(
                or_(
                    Importacao.nomeArquivo.ilike(f"%{search}%"),
                    Importacao.tipo.ilike(f"%{search}%")
                )
            )
            
        total = query.count()
        offset = (page - 1) * size
        # Order by idImportacoes desc to show latest first
        items = query.order_by(Importacao.idImportacoes.desc()).offset(offset).limit(size).all()
        
        return items, total

    def delete(self, id_importacao: int) -> bool:
        importacao = self.db.query(Importacao).filter(Importacao.idImportacoes == id_importacao).first()
        if importacao:
            self.db.delete(importacao)
            self.db.commit()
            return True
        return False
