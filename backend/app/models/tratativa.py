from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Tratativa(Base):
    __tablename__ = "tratativas"

    idtratativas = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conteudo = Column(String(1000), nullable=True)
    createdAt = Column(DateTime, nullable=True, default=func.now())
    idCreatedUser = Column(Integer, ForeignKey("users.iduser"), nullable=True)
    idNfPendencias = Column(Integer, ForeignKey("nfpendencias.idnfpendencias"), nullable=True)

    usuario = relationship("User")
    nf_pendencia = relationship("NfPendencia")
