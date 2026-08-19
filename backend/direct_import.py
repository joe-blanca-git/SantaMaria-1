import pandas as pd
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.repositories.colaborador_repository import ColaboradorRepository
from app.repositories.cargo_colaborador_repository import CargoColaboradorRepository
from app.repositories.centro_custo_repository import centro_custo_repository
from app.repositories.unidade_repository import unidade_repository
from app.schemas.cargo_colaborador import CargoColaboradorCreate
from app.schemas.centro_custo import CentroCustoCreate
from app.schemas.colaborador import ColaboradorCreate

def run_import():
    db: Session = SessionLocal()
    colab_repo = ColaboradorRepository(db)
    cargo_repo = CargoColaboradorRepository(db)
    
    filepath = r"C:\Users\tania.canedo\Desktop\RELAÇÃO FUNCIONÁRIOS .xlsx"
    print(f"Lendo {filepath}...")
    
    df = pd.read_excel(filepath, sheet_name="Pessoas", header=1)
    
    importados = 0
    cadastrados = 0
    ja_existentes = 0
    cc_cadastrados = 0
    cargos_cadastrados = 0
    erros = 0
    
    colaboradores_to_add = []
    
    print("Analisando e validando...")
    for index, row in df.iterrows():
        importados += 1
        nome_bruto = str(row.get("Nome", "")).strip()
        if not nome_bruto or str(nome_bruto).lower() == 'nan':
            continue
            
        nome = " ".join(nome_bruto.split()).title()
        
        existente = colab_repo.get_by_nome(nome)
        if existente:
            ja_existentes += 1
            continue
            
        cc_codigo_str = str(row.get("Centro de Custo", "")).strip()
        if not cc_codigo_str or cc_codigo_str.lower() == 'nan':
            print(f"[{nome}] Erro: Centro de Custo não informado.")
            erros += 1
            continue
            
        try:
            cc_codigo = int(float(cc_codigo_str))
        except ValueError:
            print(f"[{nome}] Erro: Código de Centro de Custo inválido.")
            erros += 1
            continue
            
        cc = centro_custo_repository.get_by_codigo(db, cc_codigo)
        if not cc:
            cc_nome = str(row.get("Descrição do centro de custo", "")).strip()
            if not cc_nome or cc_nome.lower() == 'nan':
                cc_nome = f"Centro de Custo {cc_codigo}"
                
            novo_cc = CentroCustoCreate(codigo=cc_codigo, nome=cc_nome, estados=[])
            cc = centro_custo_repository.create(db, novo_cc)
            cc_cadastrados += 1
            
        id_unidade = None
        unidade_codigo_str = str(row.get("Unidade", "")).strip()
        if unidade_codigo_str and unidade_codigo_str.lower() != 'nan':
            try:
                unidade_codigo = int(float(unidade_codigo_str))
                unidade = unidade_repository.get_by_codigo(db, unidade_codigo)
                if unidade:
                    id_unidade = unidade.idUnidade
            except ValueError:
                pass
                
        id_cargo = 8
        cargo_str = str(row.get("Cargo", "")).strip()
        if cargo_str and cargo_str.lower() != 'nan':
            cargo_obj = cargo_repo.get_by_nome(cargo_str)
            if not cargo_obj:
                novo_cargo = CargoColaboradorCreate(nome=cargo_str, descricao="")
                cargo_obj = cargo_repo.create(novo_cargo)
                cargos_cadastrados += 1
            id_cargo = cargo_obj.idCargoColaborador
            
        colaboradores_to_add.append({
            "nome": nome,
            "idCentroCusto": cc.idCentroCusto,
            "idUnidade": id_unidade,
            "idCargoColaborador": id_cargo
        })
        
    print("Gravando no banco...")
    for colab_data in colaboradores_to_add:
        novo = ColaboradorCreate(**colab_data)
        colab_repo.create(novo)
        cadastrados += 1
        
    db.close()
    
    print("\n--- RESUMO ---")
    print(f"Linhas analisadas: {importados}")
    print(f"Colaboradores inseridos: {cadastrados}")
    print(f"Colaboradores já existentes: {ja_existentes}")
    print(f"Cargos auto-criados: {cargos_cadastrados}")
    print(f"Centros de Custo auto-criados: {cc_cadastrados}")
    print(f"Erros de validação: {erros}")

if __name__ == "__main__":
    run_import()
