from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Colaborador(Base):
    __tablename__ = "colaboradores"

    idColaborador = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(80), nullable=False)
    papel = Column(String(45), nullable=True)
    idCargoColaborador = Column(Integer, ForeignKey("cargocolaborador.idCargoColaborador"), nullable=False)
    idCentroCusto = Column(Integer, ForeignKey("centroCusto.idCentroCusto"), nullable=False)
    idUnidade = Column(Integer, ForeignKey("Unidade.idUnidade"), nullable=True)
    createdAt = Column(DateTime, nullable=False, default=func.now())
    updatedAt = Column(DateTime, nullable=True)

    # Relacionamentos
    cargo_colaborador = relationship("CargoColaborador")
    centro_custo = relationship("CentroCusto")
    unidade = relationship("Unidade")
