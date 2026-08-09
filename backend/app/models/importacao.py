from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
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
