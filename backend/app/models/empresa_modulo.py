from sqlalchemy import Column, Integer, ForeignKey
from app.core.database import Base
from app.models.modulo import Modulo

class EmpresaModulo(Base):
    __tablename__ = "empresamodulo"

    idempresamodulo = Column(Integer, primary_key=True, index=True, autoincrement=True)
    idEmpresas = Column(Integer, ForeignKey("empresas.idEmpresas"), nullable=False)
    idModulos = Column(Integer, ForeignKey("modulos.idmodulos"), nullable=False)
