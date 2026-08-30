from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Importacao(Base):
    __tablename__ = "importacoes"

    idImportacoes = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nomeArquivo = Column(String(200), nullable=False)
    extensaoArquivo = Column(String(10), nullable=False)
    idEmpresa = Column(Integer, ForeignKey("empresas.idEmpresas"), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAte = Column(DateTime, nullable=True, onupdate=func.now())
    tipo = Column(String(45), nullable=False)
    idUserInc = Column(Integer, ForeignKey("users.iduser"), nullable=True)
    
    movimentacoes = relationship("Movimentacao", back_populates="importacao", cascade="all, delete-orphan")
    empresa = relationship("Empresa")
    usuario = relationship("User")

    @property
    def valor_total(self) -> float:
        return sum(m.valor for m in self.movimentacoes)

    @property
    def autor(self) -> str:
        return self.usuario.name if self.usuario else None
