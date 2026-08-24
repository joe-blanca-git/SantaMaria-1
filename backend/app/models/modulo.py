from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class Modulo(Base):
    __tablename__ = "modulos"

    idmodulos = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Descricao = Column(String(45), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAte = Column(DateTime, nullable=True)
    moduloscol = Column(String(45), nullable=True)
