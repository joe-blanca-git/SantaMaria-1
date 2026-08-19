from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.colaborador import ColaboradorResponse, ColaboradorCreate, ColaboradorUpdate, ColaboradorPaginatedResponse
from app.schemas.centro_custo import CentroCustoCreate
from app.models.importacao import Importacao
from app.services.colaborador_service import ColaboradorService
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
import pandas as pd
import io
import json
import time
from app.repositories.colaborador_repository import ColaboradorRepository
from app.repositories.centro_custo_repository import centro_custo_repository
from app.repositories.unidade_repository import unidade_repository
from app.repositories.cargo_colaborador_repository import CargoColaboradorRepository

router = APIRouter()

def get_service(db: Session = Depends(get_db)):
    return ColaboradorService(db)

from typing import Optional

@router.get("", response_model=ColaboradorPaginatedResponse)
def list_colaboradores(
    page: int = 1,
    page_size: int = 20,
    q: Optional[str] = None,
    service: ColaboradorService = Depends(get_service)
):
    return service.get_colaboradores(page=page, page_size=page_size, search=q)

@router.post("", response_model=ColaboradorResponse, status_code=status.HTTP_201_CREATED)
def create_colaborador(
    colab_in: ColaboradorCreate,
    service: ColaboradorService = Depends(get_service)
):
    return service.create_colaborador(colab_in)

@router.get("/{id}", response_model=ColaboradorResponse)
def get_colaborador(
    id: int,
    service: ColaboradorService = Depends(get_service)
):
    return service.get_colaborador(id)

@router.put("/{id}", response_model=ColaboradorResponse)
def update_colaborador(
    id: int,
    colab_in: ColaboradorUpdate,
    service: ColaboradorService = Depends(get_service)
):
    return service.update_colaborador(id, colab_in)

@router.patch("/{id}", response_model=ColaboradorResponse)
def patch_colaborador(
    id: int,
    colab_in: ColaboradorUpdate,
    service: ColaboradorService = Depends(get_service)
):
    return service.update_colaborador(id, colab_in)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_colaborador(
    id: int,
    service: ColaboradorService = Depends(get_service)
):
    service.delete_colaborador(id)

@router.post("/upload")
async def upload_colaboradores(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    colab_repo = ColaboradorRepository(db)
    cargo_repo = CargoColaboradorRepository(db)
    
    # Lemos o conteúdo do arquivo ANTES de iniciar o generator
    # pois o FastAPI fecha o UploadFile quando a função termina de retornar
    content = await file.read()
    
    # Registra a importação no banco
    nome_arquivo = file.filename or "desconhecido.xlsx"
    extensao = nome_arquivo.split('.')[-1] if '.' in nome_arquivo else ''
    
    nova_importacao = Importacao(
        nomeArquivo=nome_arquivo,
        extensaoArquivo=extensao,
        idEmpresa=None,
        tipo="COLABORADORES"
    )
    db.add(nova_importacao)
    db.commit()
    
    async def process_upload(file_content: bytes):
        try:
            # Etapa 1: Analisar
            yield json.dumps({"step": 0, "message": "Lendo arquivo..."}) + "\n"
            
            try:
                df = pd.read_excel(io.BytesIO(file_content), sheet_name="Pessoas", header=1)
            except Exception as e:
                yield json.dumps({"step": 3, "status": "error", "message": f"Erro ao ler a aba 'Pessoas': {str(e)}"}) + "\n"
                return
            
            # Etapa 2: Validando
            yield json.dumps({"step": 1, "message": "Verificando base de dados..."}) + "\n"
            
            colaboradores_to_add = []
            
            importados = 0
            cadastrados = 0
            ja_existentes = 0
            cc_cadastrados = 0
            cargos_cadastrados = 0
            
            from app.schemas.cargo_colaborador import CargoColaboradorCreate
            
            for index, row in df.iterrows():
                importados += 1
                nome_bruto = str(row.get("Nome", "")).strip()
                if not nome_bruto or str(nome_bruto).lower() == 'nan':
                    continue
                
                # Normaliza o nome
                nome = " ".join(nome_bruto.split()).title()
                
                # Verifica se o colaborador ja existe
                existente = colab_repo.get_by_nome(nome)
                if existente:
                    ja_existentes += 1
                    continue
                
                # Verifica o centro de custo
                cc_codigo_str = str(row.get("Centro de Custo", "")).strip()
                if not cc_codigo_str or cc_codigo_str.lower() == 'nan':
                    yield json.dumps({"step": 3, "status": "error", "message": f"Centro de Custo não informado para o colaborador {nome}"}) + "\n"
                    return
                
                try:
                    cc_codigo = int(float(cc_codigo_str))
                except ValueError:
                    yield json.dumps({"step": 3, "status": "error", "message": f"Código de Centro de Custo inválido para o colaborador {nome}"}) + "\n"
                    return
                
                cc = centro_custo_repository.get_by_codigo(db, cc_codigo)
                if not cc:
                    # Ao invés de erro, cadastra o CC sem estado
                    cc_nome = str(row.get("Descrição do centro de custo", "")).strip()
                    if not cc_nome or cc_nome.lower() == 'nan':
                        cc_nome = f"Centro de Custo {cc_codigo}"
                        
                    novo_cc = CentroCustoCreate(codigo=cc_codigo, nome=cc_nome, estados=[])
                    cc = centro_custo_repository.create(db, novo_cc)
                    cc_cadastrados += 1
                
                # Verifica a unidade (opcional na planilha, mas relaciona se existir)
                id_unidade = None
                unidade_codigo_str = str(row.get("Unidade", "")).strip()
                if unidade_codigo_str and unidade_codigo_str.lower() != 'nan':
                    try:
                        unidade_codigo = int(float(unidade_codigo_str))
                        unidade = unidade_repository.get_by_codigo(db, unidade_codigo)
                        if unidade:
                            id_unidade = unidade.idUnidade
                    except ValueError:
                        pass # Ignora codigo de unidade invalido
                
                # Verifica Cargo
                id_cargo = 8 # Padrão definido
                tipo_str = str(row.get("Cargo", "")).strip()
                if tipo_str and tipo_str.lower() != 'nan':
                    cargo_obj = cargo_repo.get_by_nome(tipo_str)
                    if not cargo_obj:
                        novo_cargo = CargoColaboradorCreate(nome=tipo_str, descricao="")
                        cargo_obj = cargo_repo.create(novo_cargo)
                        cargos_cadastrados += 1
                    id_cargo = cargo_obj.idCargoColaborador
                
                colaboradores_to_add.append({
                    "nome": nome,
                    "idCentroCusto": cc.idCentroCusto,
                    "idUnidade": id_unidade,
                    "idCargoColaborador": id_cargo
                })
            
            # Etapa 3: Atualizando
            yield json.dumps({"step": 2, "message": "Atualizando dados no banco..."}) + "\n"
            
            for colab_data in colaboradores_to_add:
                # Usa schema do create
                novo = ColaboradorCreate(**colab_data)
                colab_repo.create(novo)
                cadastrados += 1
            
            # Etapa final: Resumo
            yield json.dumps({
                "step": 3,
                "status": "success",
                "summary": {
                    "importados": importados,
                    "cadastrados": cadastrados,
                    "ja_existentes": ja_existentes,
                    "cc_cadastrados": cc_cadastrados,
                    "cargos_cadastrados": cargos_cadastrados
                }
            }) + "\n"
            
        except Exception as e:
            yield json.dumps({"step": 3, "status": "error", "message": f"Erro inesperado: {str(e)}"}) + "\n"

    return StreamingResponse(process_upload(content), media_type="application/x-ndjson")
