from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ColaboradorUnidade(Base):
    __tablename__ = "colaboradorunidade"

    idcolaboradorunidade = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idColaborador = Column(Integer, ForeignKey("colaboradores.idColaborador"), nullable=False)
    idUnidade = Column(Integer, ForeignKey("Unidade.idUnidade"), nullable=False)

    colaborador = relationship("Colaborador", back_populates="colaborador_unidades")
    unidade = relationship("Unidade")
