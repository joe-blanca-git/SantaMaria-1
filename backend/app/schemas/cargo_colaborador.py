from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class CargoColaboradorBase(BaseModel):
    nome: Optional[str] = Field(None, max_length=45)
    descricao: Optional[str] = Field(None, max_length=100)

class CargoColaboradorCreate(CargoColaboradorBase):
    pass

class CargoColaboradorUpdate(CargoColaboradorBase):
    pass

class CargoColaboradorResponse(CargoColaboradorBase):
    idCargoColaborador: int
    createdAt: Optional[datetime] = None
    updatedAte: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CargoColaboradorPaginatedResponse(BaseModel):
    items: List[CargoColaboradorResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
