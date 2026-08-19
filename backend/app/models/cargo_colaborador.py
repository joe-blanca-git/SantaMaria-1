from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class CargoColaborador(Base):
    __tablename__ = "cargocolaborador"

    idCargoColaborador = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column("Nome", String(45), nullable=True)
    descricao = Column("Descricao", String(100), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAte = Column(DateTime, nullable=True)
