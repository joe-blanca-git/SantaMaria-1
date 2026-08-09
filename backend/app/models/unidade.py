from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Unidade(Base):
    __tablename__ = "Unidade"

    idUnidade = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo = Column(Integer, nullable=False)
    descricao = Column(String(50), nullable=False)
