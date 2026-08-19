from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.cargo_colaborador import CargoColaboradorResponse
from app.schemas.centro_custo import CentroCustoResponse
from app.schemas.unidade import UnidadeResponse

class ColaboradorBase(BaseModel):
    nome: Optional[str] = Field(None, max_length=80)
    idCentroCusto: Optional[int] = None
    papel: Optional[str] = Field(None, max_length=45)
    idCargoColaborador: Optional[int] = None
    idUnidade: Optional[int] = None

class ColaboradorCreate(ColaboradorBase):
    nome: str = Field(..., max_length=80)
    idCentroCusto: int
    idCargoColaborador: int
    idUnidade: Optional[int] = None

class ColaboradorUpdate(ColaboradorBase):
    pass

class ColaboradorResponse(ColaboradorBase):
    idColaborador: int
    nome: str
    idCentroCusto: int
    idCargoColaborador: int
    idUnidade: Optional[int] = None
    createdAt: datetime
    updatedAt: Optional[datetime] = None

    # Opcional: incluir os dados dos relacionamentos
    cargo_colaborador: Optional[CargoColaboradorResponse] = None
    centro_custo: Optional[CentroCustoResponse] = None
    unidade: Optional[UnidadeResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ColaboradorPaginatedResponse(BaseModel):
    items: List[ColaboradorResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
