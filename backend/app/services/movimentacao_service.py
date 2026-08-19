from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.movimentacao import Movimentacao
from app.models.importacao import Importacao
from app.repositories.categoria_repository import CategoriaRepository
from app.repositories.colaborador_repository import ColaboradorRepository
from app.repositories.empresa_repository import EmpresaRepository
from app.schemas.movimentacao import SalvarImportacaoIAPayload

class MovimentacaoService:
    def __init__(self, db: Session):
        self.db = db
        self.cat_repo = CategoriaRepository(db)
        self.colab_repo = ColaboradorRepository(db)
        self.emp_repo = EmpresaRepository(db)

    def salvar_importacao_ia(self, payload: SalvarImportacaoIAPayload):
        # 1. Obter a extensão do arquivo
        extensao = payload.nomeArquivo.split('.')[-1] if '.' in payload.nomeArquivo else ''
        
        # O ID da Empresa para a Importacao será o da primeira despesa (já que no extrato é a mesma empresa)
        id_empresa_importacao = None
        if len(payload.despesas) > 0:
            emp = self.emp_repo.get_by_nome(payload.despesas[0].empresa)
            if emp:
                id_empresa_importacao = emp.idEmpresas

        # 2. Criar a Importação
        nova_importacao = Importacao(
            nomeArquivo=payload.nomeArquivo,
            extensaoArquivo=extensao,
            idEmpresa=id_empresa_importacao,
            tipo="IA_DESPESAS"
        )
        self.db.add(nova_importacao)
        self.db.flush() # Para gerar o idImportacoes

        # 3. Iterar pelas despesas e criar movimentações
        for d in payload.despesas:
            cat = self.cat_repo.get_by_nome(d.categoria)
            if not cat:
                raise HTTPException(status_code=400, detail=f"Categoria não encontrada: {d.categoria}")
                
            colab = self.colab_repo.get_by_nome(d.colaborador)
            if not colab:
                raise HTTPException(status_code=400, detail=f"Colaborador não encontrado: {d.colaborador}")
                
            emp = self.emp_repo.get_by_nome(d.empresa)
            if not emp:
                raise HTTPException(status_code=400, detail=f"Empresa não encontrada: {d.empresa}")
                
            nova_mov = Movimentacao(
                idCategoria=cat.idCategorias,
                idColaborador=colab.idColaborador,
                idEmpresa=emp.idEmpresas,
                idImportacoes=nova_importacao.idImportacoes,
                valor=d.valor
            )
            self.db.add(nova_mov)
            
        self.db.commit()
        return {"sucesso": True, "idImportacoes": nova_importacao.idImportacoes}
