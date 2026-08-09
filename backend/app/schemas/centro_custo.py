from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class CentroCustoBase(BaseModel):
    codigo: int
    nome: Optional[str] = None
    estados: List[str] = Field(default_factory=list)

class CentroCustoCreate(CentroCustoBase):
    pass

class CentroCustoUpdate(CentroCustoBase):
    pass

class CentroCustoResponse(BaseModel):
    idCentroCusto: int
    codigo: int
    nome: Optional[str] = None
    estados: List[str]

    model_config = ConfigDict(from_attributes=True)

class CentroCustoPaginatedResponse(BaseModel):
    items: List[CentroCustoResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
