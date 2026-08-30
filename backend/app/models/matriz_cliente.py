from sqlalchemy import Column, Integer
from app.core.database import Base

class MatrizCliente(Base):
    __tablename__ = "matrizcliente"

    idmatrizCliente = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo = Column(Integer, nullable=True)
