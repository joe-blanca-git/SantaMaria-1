from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class TipoColaboradorBase(BaseModel):
    nome: Optional[str] = Field(None, max_length=45)
    descricao: Optional[str] = Field(None, max_length=100)

class TipoColaboradorCreate(TipoColaboradorBase):
    pass

class TipoColaboradorUpdate(TipoColaboradorBase):
    pass

class TipoColaboradorResponse(TipoColaboradorBase):
    idTipoColaborador: int
    createdAt: Optional[datetime] = None
    updatedAte: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TipoColaboradorPaginatedResponse(BaseModel):
    items: List[TipoColaboradorResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
