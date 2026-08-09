from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CentroEstado(Base):
    __tablename__ = "centroEstado"

    idCentroCusto = Column(Integer, ForeignKey("centroCusto.idCentroCusto"), primary_key=True)
    estado = Column(String(45), primary_key=True)

class CentroCusto(Base):
    __tablename__ = "centroCusto"

    idCentroCusto = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo = Column(Integer, primary_key=True)
    nome = Column(String(100), nullable=True)

    # Relacionamentos
    centro_estados = relationship("CentroEstado", cascade="all, delete-orphan")

    @property
    def estados(self):
        return [ce.estado for ce in self.centro_estados]
