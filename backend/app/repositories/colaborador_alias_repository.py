from sqlalchemy.orm import Session
from app.models.colaborador_alias import ColaboradorAlias

class ColaboradorAliasRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_nome_divergente(self, nome_divergente: str):
        return self.db.query(ColaboradorAlias).filter(
            ColaboradorAlias.nome_divergente == nome_divergente
        ).first()

    def create_or_update(self, id_colaborador: int, nome_divergente: str):
        # Verifica se já existe esse alias
        existing = self.get_by_nome_divergente(nome_divergente)
        
        if existing:
            if existing.idColaborador != id_colaborador:
                existing.idColaborador = id_colaborador
                self.db.commit()
                self.db.refresh(existing)
            return existing
            
        new_alias = ColaboradorAlias(
            idColaborador=id_colaborador,
            nome_divergente=nome_divergente
        )
        self.db.add(new_alias)
        self.db.commit()
        self.db.refresh(new_alias)
        return new_alias
