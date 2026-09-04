from pydantic import BaseModel, Field
from typing import List, Optional

class ImportUnidade(BaseModel):
    idUnidade: int
    codigo: int
    descricao: str

class ImportNovo(BaseModel):
    documento: str
    nome: str
    unidades: List[ImportUnidade]
    centroCustoCodigo: int
    idCentroCusto: Optional[int] = None
    centroCustoNome: Optional[str] = None
    ccEncontrado: bool

class ImportDivergente(BaseModel):
    idColaborador: int
    documento: str
    nome: str
    unidades: List[ImportUnidade]
    unidadesAtuais: List[ImportUnidade]
    centroCustoCodigo: int
    idCentroCusto: Optional[int] = None
    centroCustoNome: Optional[str] = None
    ccEncontrado: bool
    idCentroCustoAtual: int
    centroCustoAtualNome: Optional[str] = None
    ccDivergente: bool
    unidadesDivergentes: bool
    reativado: bool

class ImportDesligado(BaseModel):
    idColaborador: int
    documento: str
    nome: str
    unidadesAtuais: List[ImportUnidade]
    centroCustoAtualNome: Optional[str] = None

class ImportErro(BaseModel):
    aba: str
    linha: int
    nome: Optional[str] = None
    documento: Optional[str] = None
    motivo: str

class ImportPreviewResponse(BaseModel):
    novos: List[ImportNovo]
    divergentes: List[ImportDivergente]
    desligados: List[ImportDesligado]
    erros: List[ImportErro]

class ImportProcessarNovo(BaseModel):
    documento: str
    nome: str
    idCentroCusto: int
    unidadeIds: List[int] = Field(default_factory=list)

class ImportProcessarDivergente(BaseModel):
    idColaborador: int
    idCentroCusto: int
    unidadeIds: List[int] = Field(default_factory=list)

class ImportProcessarDesligado(BaseModel):
    idColaborador: int

class ImportProcessarRequest(BaseModel):
    novos: List[ImportProcessarNovo] = Field(default_factory=list)
    divergentes: List[ImportProcessarDivergente] = Field(default_factory=list)
    desligados: List[ImportProcessarDesligado] = Field(default_factory=list)

class ImportProcessarResponse(BaseModel):
    cadastrados: int
    atualizados: int
    desligados: int
