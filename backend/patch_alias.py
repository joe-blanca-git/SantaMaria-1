import asyncio
from sqlalchemy import text
from app.core.database import engine, Base
from app.models.colaborador_alias import ColaboradorAlias
from app.models.colaborador import Colaborador

def apply_patch():
    print("Criando tabela colaborador_aliases...")
    Base.metadata.create_all(bind=engine, tables=[ColaboradorAlias.__table__])
    print("Tabela criada com sucesso!")

if __name__ == "__main__":
    apply_patch()
