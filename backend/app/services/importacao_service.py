import math
from app.repositories.importacao_repository import ImportacaoRepository
from app.schemas.importacao import ImportacaoPaginatedResponse
from sqlalchemy.orm import Session
from app.models.importacao import Importacao

class ImportacaoService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ImportacaoRepository(db)

    def listar_importacoes(self, page: int = 1, size: int = 10, search: str = None, categoria: str = None) -> ImportacaoPaginatedResponse:
        items, total = self.repository.get_all(page=page, size=size, search=search, categoria=categoria)
        total_pages = math.ceil(total / size) if size > 0 else 1
        
        return ImportacaoPaginatedResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            total_pages=total_pages
        )

    def excluir_importacao(self, id_importacao: int) -> bool:
        return self.repository.delete(id_importacao)

    def registrar_importacao(self, nome_arquivo: str, extensao: str, tipo: str, id_empresa: int = None) -> Importacao:
        nova_importacao = Importacao(
            nomeArquivo=nome_arquivo,
            extensaoArquivo=extensao,
            tipo=tipo,
            idEmpresa=id_empresa
        )
        self.db.add(nova_importacao)
        self.db.commit()
        self.db.refresh(nova_importacao)
        return nova_importacao
