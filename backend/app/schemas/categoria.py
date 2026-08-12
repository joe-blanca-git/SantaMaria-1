from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class CategoriaBase(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaUpdate(CategoriaBase):
    pass

class CategoriaResponse(CategoriaBase):
    idCategorias: int
    createdAt: Optional[datetime] = None
    updatedAte: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CategoriaPaginatedResponse(BaseModel):
    items: List[CategoriaResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
