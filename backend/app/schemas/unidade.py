from pydantic import BaseModel, ConfigDict

class UnidadeBase(BaseModel):
    codigo: int
    descricao: str

class UnidadeCreate(UnidadeBase):
    pass

class UnidadeUpdate(UnidadeBase):
    pass

class UnidadeResponse(UnidadeBase):
    idUnidade: int

    model_config = ConfigDict(from_attributes=True)

from typing import List
class UnidadePaginatedResponse(BaseModel):
    items: List[UnidadeResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
