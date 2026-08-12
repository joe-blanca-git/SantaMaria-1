from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class Categoria(Base):
    __tablename__ = "categorias"

    idCategorias = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(45), nullable=True)
    descricao = Column(String(45), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAte = Column(DateTime, nullable=True)
