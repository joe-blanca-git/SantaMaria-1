from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class HistoricoPendencia(Base):
    __tablename__ = "historicopendencia"

    idhistoricopendencia = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idNfPendencias = Column(Integer, ForeignKey("nfpendencias.idnfpendencias"), nullable=True)
    observacao = Column(String(500), nullable=True)
    tipo = Column(String(45), nullable=True)  # ex.: "Pendencia Importada", "Alteração de Fase", "Alteração de Status", "Tratativa Registrada"
    createdAt = Column(DateTime, nullable=True, default=func.now())
    idUserCreated = Column(Integer, ForeignKey("users.iduser"), nullable=True)

    nf_pendencia = relationship("NfPendencia")
    usuario = relationship("User")
