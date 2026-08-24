from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ColaboradorAlias(Base):
    __tablename__ = "colaborador_aliases"

    idAlias = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idColaborador = Column(Integer, ForeignKey("colaboradores.idColaborador"), nullable=False)
    nome_divergente = Column(String(120), nullable=False, unique=True, index=True)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(DateTime, nullable=True, onupdate=func.now())

    # Relacionamentos
    colaborador = relationship("Colaborador")
