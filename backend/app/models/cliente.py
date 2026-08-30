from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    idclientes = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo = Column(Integer, nullable=True)
    nome = Column(String(100), nullable=True)
