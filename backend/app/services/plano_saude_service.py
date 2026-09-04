from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from fastapi import UploadFile
import pandas as pd
import io
from app.models.movimentacao import Movimentacao
from app.models.importacao import Importacao
from app.models.colaborador import Colaborador
from app.models.empresa import Empresa
from app.models.unidade import Unidade
from app.models.centro_custo import CentroCusto
from app.schemas.plano_saude import RelatorioGeralResponse, RelatorioGeralRow, ConciliacaoResponse, ConciliacaoRow

class PlanoSaudeService:
    def __init__(self, db: Session):
        self.db = db

    def obter_relatorio_geral(self, mes: int, ano: int, search: str = None, id_empresa: int = None, page: int = 1, size: int = 10) -> RelatorioGeralResponse:
        query = self.db.query(
            Unidade.codigo.label("unidade_codigo"),
            Unidade.descricao.label("unidade_descricao"),
            Empresa.nome.label("empresa_nome"),
            Colaborador.nome.label("colaborador_nome"),
            CentroCusto.codigo.label("centro_custo_codigo"),
            func.sum(Movimentacao.valor).label("total")
        ).join(
            Importacao, Importacao.idImportacoes == Movimentacao.idImportacoes
        ).join(
            Colaborador, Colaborador.idColaborador == Movimentacao.idColaborador
        ).join(
            Empresa, Empresa.idEmpresas == Movimentacao.idEmpresa
        ).outerjoin(
            Unidade, Unidade.idUnidade == Colaborador.idUnidade
        ).join(
            CentroCusto, CentroCusto.idCentroCusto == Colaborador.idCentroCusto
        )

        # Filtros
        query = query.filter(
            Importacao.tipo.in_(["PLANO_SAUDE", "SEGURO"])
        )
        
        # Filtro de competência extraído do createdAt da Movimentacao
        query = query.filter(
            extract('year', Movimentacao.createdAt) == ano,
            extract('month', Movimentacao.createdAt) == mes
        )

        if search:
            search_str = f"%{search}%"
            query = query.filter(
                (Colaborador.nome.ilike(search_str)) |
                (Empresa.nome.ilike(search_str)) |
                (Unidade.descricao.ilike(search_str))
            )
            
        if id_empresa:
            query = query.filter(Movimentacao.idEmpresa == id_empresa)

        # Agrupamento e Ordenação
        query = query.group_by(
            Colaborador.idColaborador,
            Unidade.codigo,
            Unidade.descricao,
            Empresa.nome,
            CentroCusto.codigo,
            Colaborador.nome
        ).order_by(Empresa.nome, Colaborador.nome)
        
        # Total de registros (para paginação)
        total_items = query.count()
        
        # Paginação
        offset = (page - 1) * size
        results = query.offset(offset).limit(size).all()
        
        items = []
        comp_str = f"{mes:02d}/{ano}"
        for r in results:
            unidade_str = str(r.unidade_codigo) if r.unidade_codigo is not None else None
            items.append(RelatorioGeralRow(
                competencia=comp_str,
                unidade=unidade_str,
                empresa=r.empresa_nome,
                nome=r.colaborador_nome,
                centro_custo=str(r.centro_custo_codigo) if r.centro_custo_codigo is not None else None,
                total=r.total or 0.0
            ))
            
        # Calcular o total geral em R$ da consulta
        # Como a query já está agrupada, count() nos dá o número de agrupamentos, 
        # mas para somar precisamos encapsular como subquery ou iterar. 
        # Uma abordagem leve é executar a soma na subquery ou recriar a query sem agrupar
        # para a soma global.
        total_valor_query = self.db.query(func.sum(Movimentacao.valor)).join(
            Importacao, Importacao.idImportacoes == Movimentacao.idImportacoes
        ).join(
            Colaborador, Colaborador.idColaborador == Movimentacao.idColaborador
        ).join(
            Empresa, Empresa.idEmpresas == Movimentacao.idEmpresa
        ).outerjoin(
            Unidade, Unidade.idUnidade == Colaborador.idUnidade
        ).filter(
            Importacao.tipo.in_(["PLANO_SAUDE", "SEGURO"]),
            extract('year', Movimentacao.createdAt) == ano,
            extract('month', Movimentacao.createdAt) == mes
        )
        if search:
            total_valor_query = total_valor_query.filter(
                (Colaborador.nome.ilike(search_str)) |
                (Empresa.nome.ilike(search_str)) |
                (Unidade.descricao.ilike(search_str))
            )
        if id_empresa:
            total_valor_query = total_valor_query.filter(Movimentacao.idEmpresa == id_empresa)
            
        total_valor_scalar = total_valor_query.scalar() or 0.0

        return RelatorioGeralResponse(
            items=items,
            total=total_items,
            total_valor=total_valor_scalar,
            page=page,
            size=size
        )

    def exportar_relatorio_geral(self, mes: int, ano: int, search: str = None, id_empresa: int = None):
        import pandas as pd
        import io
        from fastapi.responses import StreamingResponse

        # Get all data without pagination
        res = self.obter_relatorio_geral(mes, ano, search, id_empresa, page=1, size=999999)
        
        data = []
        for r in res.items:
            data.append({
                "Competência": r.competencia,
                "Unidade": r.unidade or "N/D",
                "Empresa": r.empresa,
                "Nome": r.nome,
                "Centro de Custo": r.centro_custo or "N/D",
                "Total (R$)": r.total
            })
            
        df = pd.DataFrame(data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Relatório Geral')
            worksheet = writer.sheets['Relatório Geral']
            
            # Basic formatting: auto-adjust columns
            for idx, col in enumerate(df.columns):
                series = df[col]
                max_len = max((
                    series.astype(str).map(len).max(),
                    len(str(col))
                )) + 2
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_len, 50)
                
        output.seek(0)
        
        filename = f"relatorio_geral_planosaude_{mes:02d}_{ano}.xlsx"
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )

    def conciliar_planilha(self, file: UploadFile) -> ConciliacaoResponse:
        # Ler a planilha
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Encontrar competência (Data Trans)
        data_trans_col = df.get('Data Trans')
        if data_trans_col is None or data_trans_col.empty:
            raise ValueError("Coluna 'Data Trans' não encontrada na planilha.")
            
        val = data_trans_col.dropna().iloc[0]
        try:
            val_float = float(val)
            primeira_data = pd.to_datetime(val_float, origin='1899-12-30', unit='D')
        except ValueError:
            primeira_data = pd.to_datetime(val)
            
        mes = primeira_data.month
        ano = primeira_data.year
        competencia_str = f"{mes:02d}/{ano}"

        # Agrupar por Estab e somar Débito. Obter também o Nome Abrev se disponível.
        # "Estab" pode vir como int ou str.
        if 'Estab' not in df.columns or 'Débito' not in df.columns:
            raise ValueError("Colunas 'Estab' ou 'Débito' não encontradas na planilha.")
            
        df['Estab_str'] = df['Estab'].astype(str).str.strip().str.lstrip('0') # Normalize
        
        # Agrupa e calcula por Estab e Nome Abrev
        agg_dict = {'Débito': 'sum'}
        group_cols = ['Estab_str']
        if 'Nome Abrev' in df.columns:
            df['Nome_Abrev_str'] = df['Nome Abrev'].astype(str).str.strip().str.upper()
            group_cols.append('Nome_Abrev_str')
            
        planilha_grouped = df.groupby(group_cols).agg(agg_dict).reset_index()

        # Query the database
        db_query = self.db.query(
            Unidade.codigo.label("unidade_codigo"),
            Empresa.nomeAbrev.label("empresa_abrev"),
            func.sum(Movimentacao.valor).label("total_sistema")
        ).join(
            Importacao, Importacao.idImportacoes == Movimentacao.idImportacoes
        ).join(
            Colaborador, Colaborador.idColaborador == Movimentacao.idColaborador
        ).join(
            Unidade, Unidade.idUnidade == Colaborador.idUnidade
        ).join(
            Empresa, Empresa.idEmpresas == Movimentacao.idEmpresa
        ).filter(
            Importacao.tipo.in_(["PLANO_SAUDE", "SEGURO"]),
            extract('year', Movimentacao.createdAt) == ano,
            extract('month', Movimentacao.createdAt) == mes
        ).group_by(
            Unidade.codigo,
            Empresa.nomeAbrev
        ).all()

        # Convert to dictionary for easy matching: key is (estab, empresa_abrev)
        db_totais = {}
        for r in db_query:
            cod_str = str(r.unidade_codigo).strip().lstrip('0')
            emp_abrev = str(r.empresa_abrev).strip().upper() if r.empresa_abrev else "N/D"
            db_totais[(cod_str, emp_abrev)] = float(r.total_sistema or 0.0)

        # Merge results
        linhas = []
        processados = set()
        divergencias_count = 0

        # Iterar sobre o que veio da planilha
        for _, row in planilha_grouped.iterrows():
            estab = str(row['Estab_str'])
            total_plan = float(row['Débito'])
            abrev = str(row['Nome_Abrev_str']) if 'Nome_Abrev_str' in row else "N/D"
            
            # Key for matching
            match_key = (estab, abrev)
            
            total_sis = db_totais.get(match_key, 0.0)
            diff = abs(total_plan - total_sis)
            
            if match_key not in db_totais:
                status = "NAO_ENCONTRADO_SISTEMA"
                divergencias_count += 1
            elif diff > 0.01:
                status = "DIVERGENTE"
                divergencias_count += 1
            else:
                status = "OK"
                
            linhas.append(ConciliacaoRow(
                unidade_codigo=estab,
                unidade_descricao="",
                empresa_abrev=abrev,
                total_planilha=total_plan,
                total_sistema=total_sis,
                diferenca=total_plan - total_sis,
                status=status
            ))
            processados.add(match_key)
            
        # Verificar chaves que tem no sistema mas não na planilha
        for match_key, total_sis in db_totais.items():
            if match_key not in processados:
                linhas.append(ConciliacaoRow(
                    unidade_codigo=match_key[0],
                    unidade_descricao="",
                    empresa_abrev=match_key[1],
                    total_planilha=0.0,
                    total_sistema=total_sis,
                    diferenca=0.0 - total_sis,
                    status="NAO_ENCONTRADO_PLANILHA"
                ))
                divergencias_count += 1

        linhas.sort(key=lambda x: (x.unidade_codigo, x.empresa_abrev))

        return ConciliacaoResponse(
            competencia=competencia_str,
            linhas=linhas,
            total_divergencias=divergencias_count,
            total_processado=len(linhas)
        )
