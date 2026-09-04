from pydantic import BaseModel
from typing import List, Optional

class RelatorioGeralRow(BaseModel):
    competencia: str
    unidade: Optional[str] = None
    empresa: Optional[str] = None
    nome: Optional[str] = None
    centro_custo: Optional[str] = None
    total: float

class RelatorioGeralResponse(BaseModel):
    items: List[RelatorioGeralRow]
    total: int
    total_valor: float
    page: int
    size: int

class ConciliacaoRow(BaseModel):
    unidade_codigo: str
    unidade_descricao: str
    empresa_abrev: str
    total_planilha: float
    total_sistema: float
    diferenca: float
    status: str

class ConciliacaoResponse(BaseModel):
    competencia: str
    linhas: List[ConciliacaoRow]
    total_divergencias: int
    total_processado: int
