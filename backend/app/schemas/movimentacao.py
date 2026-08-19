from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class MovimentacaoBase(BaseModel):
    idCategoria: int
    idColaborador: int
    idEmpresa: int
    idImportacoes: int
    valor: float

class MovimentacaoCreate(MovimentacaoBase):
    pass

class MovimentacaoResponse(MovimentacaoBase):
    idMovimentacoes: int
    createdAt: datetime
    updatedAte: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DespesaIAPayload(BaseModel):
    categoria: str
    colaborador: str
    empresa: str
    valor: float

class SalvarImportacaoIAPayload(BaseModel):
    nomeArquivo: str
    despesas: List[DespesaIAPayload]
