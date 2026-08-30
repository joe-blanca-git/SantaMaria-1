from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.empresa import EmpresaResponse

class ImportacaoBase(BaseModel):
    nomeArquivo: str
    extensaoArquivo: str
    idEmpresa: Optional[int] = None
    tipo: str

class ImportacaoCreate(ImportacaoBase):
    pass

class ImportacaoResponse(ImportacaoBase):
    idImportacoes: int
    createdAt: datetime
    updatedAte: Optional[datetime] = None
    empresa: Optional[EmpresaResponse] = None
    valor_total: float = 0.0
    autor: Optional[str] = None

    class Config:
        from_attributes = True

class ImportacaoPaginatedResponse(BaseModel):
    items: List[ImportacaoResponse]
    total: int
    page: int
    size: int
    total_pages: int
