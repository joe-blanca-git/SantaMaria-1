from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.importacao import ImportacaoPaginatedResponse
from app.services.importacao_service import ImportacaoService
from app.services.ia_service import IAService
from app.services.dashboard_service import DashboardService
from app.repositories.categoria_repository import CategoriaRepository
from app.repositories.colaborador_repository import ColaboradorRepository

router = APIRouter()

def get_service(db: Session = Depends(get_db)):
    return ImportacaoService(db)

@router.get("/", response_model=ImportacaoPaginatedResponse)
def get_importacoes(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: str = Query(None, description="Busca por nome de arquivo ou tipo"),
    service: ImportacaoService = Depends(get_service)
):
    return service.listar_importacoes(page=page, size=size, search=search)

@router.post("/ia/analise-extrato")
async def analise_extrato_ia(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    empresa_nome: str = Form(...),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo inválido")
        
    try:
        t0_overall = time.time() if 'time' in globals() else __import__('time').time()
        content = await file.read()
        
        # Buscar listas base do DB para passar como contexto
        cat_repo = CategoriaRepository(db)
        colab_repo = ColaboradorRepository(db)
        
        categorias_db, _ = cat_repo.get_all(limit=1000)
        nomes_categorias = [c.nome for c in categorias_db]
        
        colabs_db, _ = colab_repo.get_all(limit=5000)
        nomes_colaboradores = [c.nome for c in colabs_db]
        
        ia = IAService()
        ia_result = await ia.analisar_extrato(
            file_content=content,
            file_name=file.filename,
            categorias=nomes_categorias,
            colaboradores=nomes_colaboradores,
            empresa_context=empresa_nome
        )
        
        despesas_brutas = ia_result.get("despesas", [])
        metrics = ia_result.get("metrics", {})
        file_to_delete = ia_result.get("file_name_to_delete")
        
        # Se for necessário deletar arquivo da Files API, agenda em background
        if file_to_delete:
            background_tasks.add_task(ia.deletar_arquivo, file_to_delete)
            
        # Consolidar os valores por Colaborador + Categoria (somar)
        t0_consolidation = (__import__('time').time() if 'time' not in globals() else time.time())
        consolidadas = {}
        for d in despesas_brutas:
            chave = f"{d['colaborador']}|{d['categoria']}"
            if chave not in consolidadas:
                consolidadas[chave] = d
            else:
                consolidadas[chave]['valor'] += d['valor']
                
        resultado_final = list(consolidadas.values())
        
        # Atualiza métricas
        post_proc_ms = metrics.get("post_processing_ms", 0.0)
        time_module = (__import__('time') if 'time' not in globals() else time)
        metrics["post_processing_ms"] = round(post_proc_ms + (time_module.time() - t0_consolidation) * 1000, 2)
        metrics["total_ms"] = round((time_module.time() - t0_overall) * 1000, 2)
        
        # Logging exigido de métricas de latência
        print(f"[IA] Upload PDF: {metrics['upload_pdf_ms']} ms")
        print(f"[IA] File ready: {metrics['file_ready_ms']} ms")
        print(f"[IA] Gemini generation: {metrics['gemini_generation_ms']} ms")
        print(f"[IA] Structured output: {metrics['structured_output_ms']} ms")
        print(f"[IA] Post processing: {metrics['post_processing_ms']} ms")
        print(f"[IA] Total: {metrics['total_ms']} ms")
        
        return {"sucesso": True, "dados": resultado_final}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.schemas.movimentacao import SalvarImportacaoIAPayload
from app.services.movimentacao_service import MovimentacaoService

@router.post("/ia/salvar")
def salvar_movimentacoes_ia(
    payload: SalvarImportacaoIAPayload,
    db: Session = Depends(get_db)
):
    try:
        service = MovimentacaoService(db)
        resultado = service.salvar_importacao_ia(payload)
        return resultado
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id_importacao}")
def excluir_importacao(
    id_importacao: int,
    db: Session = Depends(get_db)
):
    try:
        service = ImportacaoService(db)
        sucesso = service.excluir_importacao(id_importacao)
        if not sucesso:
            raise HTTPException(status_code=404, detail="Importação não encontrada")
        return {"sucesso": True, "mensagem": "Importação e movimentações vinculadas excluídas com sucesso"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
def get_dashboard(
    data_inicio: str = Query(None),
    data_fim: str = Query(None),
    id_empresa: int = Query(None),
    id_colaborador: int = Query(None),
    id_categoria: int = Query(None),
    db: Session = Depends(get_db)
):
    try:
        service = DashboardService(db)
        return service.obter_dados(
            data_inicio=data_inicio,
            data_fim=data_fim,
            id_empresa=id_empresa,
            id_colaborador=id_colaborador,
            id_categoria=id_categoria
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import re
import io
import pandas as pd
from fastapi.responses import StreamingResponse
from html.parser import HTMLParser

class AtacadaoHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self.current_table = []
        self.current_row = []
        self.current_cell = []
        self.in_table = False
        self.in_tr = False
        self.in_td_or_th = False

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.in_table = True
            self.current_table = []
        elif tag == 'tr' and self.in_table:
            self.in_tr = True
            self.current_row = []
        elif tag in ('td', 'th') and self.in_tr:
            self.in_td_or_th = True
            self.current_cell = []

    def handle_endtag(self, tag):
        if tag == 'table':
            self.in_table = False
            if self.current_table:
                self.tables.append(self.current_table)
        elif tag == 'tr' and self.in_table:
            self.in_tr = False
            if self.current_row:
                self.current_table.append(self.current_row)
        elif tag in ('td', 'th') and self.in_tr:
            self.in_td_or_th = False
            cell_text = "".join(self.current_cell).strip()
            self.current_row.append(cell_text)

    def handle_data(self, data):
        if self.in_td_or_th:
            self.current_cell.append(data)

@router.post("/atacadao/extrair")
async def extrair_atacadao(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo inválido")
        
    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="ignore")
        
        parser = AtacadaoHTMLParser()
        parser.feed(content)
        
        def parse_float(val_str):
            if not val_str:
                return 0.0
            cleaned = val_str.replace('.', '').replace(',', '.').strip()
            try:
                return float(cleaned)
            except ValueError:
                return 0.0

        # Extrair o Total do Depósito do texto do HTML
        total_deposito = 0.0
        match_total = re.search(r'Total do Dep&oacute;sito:\s*([\d\.,]+)', content, re.IGNORECASE)
        if not match_total:
            match_total = re.search(r'Total do Depósito:\s*([\d\.,]+)', content, re.IGNORECASE)
        if match_total:
            total_deposito = parse_float(match_total.group(1))

        rows_to_export = []
        for table in parser.tables:
            if not table:
                continue
            headers = [h.strip() for h in table[0]]
            if 'N Fiscal' not in headers:
                continue
            
            n_fiscal_idx = headers.index('N Fiscal')
            val_idx = headers.index('Valor') if 'Valor' in headers else None
            abat_idx = headers.index('Abatimento') if 'Abatimento' in headers else None
            liq_idx = headers.index('Vlr liquido') if 'Vlr liquido' in headers else None
            
            for row in table[1:]:
                if len(row) <= n_fiscal_idx:
                    continue
                
                n_fiscal_raw = row[n_fiscal_idx].strip()
                if not n_fiscal_raw or n_fiscal_raw.lower() == 'total' or 'total' in n_fiscal_raw.lower():
                    continue
                
                # Filtro: Apenas notas fiscais que comecem com '0000'
                if not n_fiscal_raw.startswith('0000'):
                    continue
                
                # Formatação: Remover os dois primeiros zeros (de 4 zeros para 2 zeros)
                n_fiscal_formatted = n_fiscal_raw[2:]
                
                # Parcela:
                # Se terminar com 'T', Parcela '02', senão '01'
                parcela = '02' if n_fiscal_raw.endswith('T') else '01'
                
                valor_total = parse_float(row[val_idx]) if val_idx is not None and val_idx < len(row) else 0.0
                abatimento = parse_float(row[abat_idx]) if abat_idx is not None and abat_idx < len(row) else 0.0
                
                if liq_idx is not None and liq_idx < len(row):
                    valor_liquido = parse_float(row[liq_idx])
                else:
                    valor_liquido = valor_total
                    
                rows_to_export.append({
                    'Nota Fiscal': n_fiscal_formatted,
                    'Parcela': parcela,
                    'Abatimento': abatimento if abatimento != 0.0 else None,
                    'Valor Liquido': valor_liquido,
                    'Valor Total': valor_total
                })
        
        if not rows_to_export:
            raise HTTPException(status_code=400, detail="Nenhum dado de Nota Fiscal começando com '0000' foi encontrado no HTML.")
            
        # Caso não consiga extrair o total do depósito via texto, calcula a soma do valor líquido
        if total_deposito == 0.0:
            total_deposito = sum((r['Valor Liquido'] or 0.0) for r in rows_to_export)

        # Geração do arquivo Excel formatado com openpyxl
        import openpyxl
        from openpyxl.styles import Font, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Composição de Pagamento"
        
        # Ativar linhas de grade
        ws.views.sheetView[0].showGridLines = True

        # Cabeçalhos exatamente conforme o print
        headers = ['Nota Fiscal', 'Parcela', 'Abatimento', 'Valor Líquido', '', '', 'Valor Total']
        ws.append(headers)

        # Preenchimento das linhas
        for i, item in enumerate(rows_to_export):
            # Apenas a linha 2 da coluna G possui o total geral
            val_total = total_deposito if i == 0 else None
            
            ws.append([
                item['Nota Fiscal'],
                item['Parcela'],
                item['Abatimento'],
                item['Valor Liquido'],
                '',
                '',
                val_total
            ])

        # Definição das fontes e alinhamento
        font_header = Font(name='Calibri', size=11, bold=True)
        font_body = Font(name='Calibri', size=11, bold=False)
        align_center = Alignment(horizontal='center', vertical='center')
        align_right = Alignment(horizontal='right', vertical='center')
        align_left = Alignment(horizontal='left', vertical='center')

        # Formato contábil do Excel (R$ e valor alinhados nas extremidades da célula)
        accounting_format = '_("R$"* #,##0.00_);_("R$"* (#,##0.00);_("R$"* "-"_);_(@_)'

        # Estilizar cabeçalho
        for col_idx, col_name in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = font_header
            if col_idx in [1, 2]:
                cell.alignment = align_left
            elif col_idx in [3, 4, 7]:
                cell.alignment = align_right

        # Estilizar o corpo e aplicar formatação de números
        for r_idx in range(2, len(rows_to_export) + 2):
            # Nota Fiscal (Col 1)
            cell_nf = ws.cell(row=r_idx, column=1)
            cell_nf.font = font_body
            cell_nf.number_format = '@' # Formato Texto
            cell_nf.alignment = align_left
            
            # Parcela (Col 2)
            cell_par = ws.cell(row=r_idx, column=2)
            cell_par.font = font_body
            cell_par.number_format = '@' # Formato Texto
            cell_par.alignment = align_left
            
            # Abatimento (Col 3)
            cell_ab = ws.cell(row=r_idx, column=3)
            cell_ab.font = font_body
            cell_ab.number_format = accounting_format
            cell_ab.alignment = align_right
            
            # Valor Líquido (Col 4)
            cell_liq = ws.cell(row=r_idx, column=4)
            cell_liq.font = font_body
            cell_liq.number_format = accounting_format
            cell_liq.alignment = align_right
            
            # Valor Total (Col 7)
            cell_tot = ws.cell(row=r_idx, column=7)
            cell_tot.font = font_body
            if cell_tot.value is not None:
                cell_tot.number_format = accounting_format
                cell_tot.alignment = align_right

        # Definir larguras de coluna estáticas para se adequar ao print
        ws.column_dimensions['A'].width = 16
        ws.column_dimensions['B'].width = 10
        ws.column_dimensions['C'].width = 16
        ws.column_dimensions['D'].width = 18
        ws.column_dimensions['E'].width = 5
        ws.column_dimensions['F'].width = 5
        ws.column_dimensions['G'].width = 20

        # Salvar em buffer
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = file.filename.rsplit('.', 1)[0] + "_extraido.xlsx"
        headers_response = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers_response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sendas/extrair")
async def extrair_sendas(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo inválido")
        
    try:
        content_bytes = await file.read()
        
        # Load the spreadsheet
        df = pd.read_excel(io.BytesIO(content_bytes), header=None)
        
        # Resolve H and X column names/indices (H is 8th column -> index 7, X is 24th column -> index 23)
        if df.shape[1] < 24:
            raise HTTPException(
                status_code=400, 
                detail=f"A planilha importada precisa ter pelo menos 24 colunas (até a coluna X). Colunas encontradas: {df.shape[1]}."
            )
            
        h_col_idx = 7
        x_col_idx = 23
        
        def parse_float(val):
            if pd.isna(val):
                return 0.0
            if isinstance(val, (int, float)):
                return float(val)
            cleaned = str(val).replace('.', '').replace(',', '.').replace('R$', '').strip()
            try:
                return float(cleaned)
            except ValueError:
                return 0.0

        notas_fiscais = []
        devolucoes = []
        abatimentos = []

        # Iterate rows starting from index 0 or 1 depending on header detection
        for idx, row in df.iterrows():
            val_h_raw = row[h_col_idx]
            val_x_raw = row[x_col_idx]
            
            if pd.isna(val_h_raw):
                continue
                
            val_h = str(val_h_raw).strip()
            # Remove decimal part .0 if auto-formatted as float
            if val_h.endswith('.0'):
                val_h = val_h[:-2]
                
            val_x = parse_float(val_x_raw)
            
            # Filtro: Ignorar linhas e dados onde a coluna X estiver com 0
            if val_x == 0.0:
                continue

            # Skip header rows
            if val_h.lower() in ('h', 'código', 'nota fiscal', 'portador', 'n fiscal', 'tipo'):
                continue

            # Apply rules:
            # 1. Nota Fiscal: starts with 1 or 2 AND ends with 2
            if val_h.startswith(('1', '2')) and val_h.endswith('2'):
                # Formatação: Remover espaços e o último caractere '2', e preencher com zeros à esquerda até obter 7 dígitos
                cleaned_h = val_h.replace(' ', '')
                if cleaned_h.endswith('2'):
                    cleaned_h = cleaned_h[:-1]
                formatted_nf = cleaned_h.zfill(7)
                notas_fiscais.append((formatted_nf, val_x))
            # 2. Abatimento: starts with "AC"
            elif val_h.startswith('AC'):
                abatimentos.append((val_h, val_x))
            # 3. Devolução: starts with any number AND ends with "300"
            elif val_h.endswith('300') and val_h[0].isdigit():
                devolucoes.append((val_h, val_x))
                
        if not notas_fiscais and not devolucoes and not abatimentos:
            raise HTTPException(
                status_code=400, 
                detail="Nenhum registro correspondente aos filtros de Nota Fiscal, Devolução ou Abatimento foi encontrado na coluna H."
            )

        # Generate excel with openpyxl to match the layout
        import openpyxl
        from openpyxl.styles import Font, Alignment
        from openpyxl.utils import get_column_letter

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Filtro Sendas"
        ws.views.sheetView[0].showGridLines = True

        # Headers exactly as requested
        # Col A: Nota fiscal, Col B: Valor Total
        # Col D: Valor Total, Col E: Devolução
        # Col I: Abatimento, Col J: Valor Total
        # Col L: Soma Total
        ws.cell(row=1, column=1, value="Nota fiscal")
        ws.cell(row=1, column=2, value="Valor Total")
        ws.cell(row=1, column=4, value="Valor Total")
        ws.cell(row=1, column=5, value="Devolução")
        ws.cell(row=1, column=9, value="Abatimento")
        ws.cell(row=1, column=10, value="Valor Total")
        ws.cell(row=1, column=12, value="Soma Total")

        max_rows = max(len(notas_fiscais), len(devolucoes), len(abatimentos))

        for r_idx in range(max_rows):
            row_num = r_idx + 2
            
            # 1. Nota Fiscal (Col A, B)
            if r_idx < len(notas_fiscais):
                nf_code, nf_val = notas_fiscais[r_idx]
                ws.cell(row=row_num, column=1, value=nf_code)
                ws.cell(row=row_num, column=2, value=nf_val)
                
            # 2. Devolução (Col E, D)
            if r_idx < len(devolucoes):
                dev_code, dev_val = devolucoes[r_idx]
                ws.cell(row=row_num, column=5, value=dev_code)
                ws.cell(row=row_num, column=4, value=dev_val)
                
            # 3. Abatimento (Col I, J)
            if r_idx < len(abatimentos):
                ab_code, ab_val = abatimentos[r_idx]
                ws.cell(row=row_num, column=9, value=ab_code)
                ws.cell(row=row_num, column=10, value=ab_val)

        # Write Soma total on Row 2 of Column L
        soma_nf = sum(v for _, v in notas_fiscais)
        soma_dev = sum(v for _, v in devolucoes)
        soma_abat = sum(v for _, v in abatimentos)
        soma_total = soma_nf + soma_dev + soma_abat

        ws.cell(row=2, column=12, value=soma_total)

        # Formatting
        font_header = Font(name='Calibri', size=11, bold=True)
        font_body = Font(name='Calibri', size=11, bold=False)
        align_center = Alignment(horizontal='center', vertical='center')
        align_right = Alignment(horizontal='right', vertical='center')
        align_left = Alignment(horizontal='left', vertical='center')
        accounting_format = '_("R$"* #,##0.00_);_("R$"* (#,##0.00);_("R$"* "-"_);_(@_)'

        # Format Headers
        active_cols = [1, 2, 4, 5, 9, 10, 12]
        for col_idx in active_cols:
            cell = ws.cell(row=1, column=col_idx)
            cell.font = font_header
            if col_idx in [1, 5, 9]:
                cell.alignment = align_left
            elif col_idx in [2, 4, 10, 12]:
                cell.alignment = align_right

        # Format Body
        for r_idx in range(2, max_rows + 2):
            # Nota Fiscal (Col 1)
            cell_nf = ws.cell(row=r_idx, column=1)
            cell_nf.font = font_body
            cell_nf.number_format = '@'
            cell_nf.alignment = align_left
            
            # NF Valor (Col 2)
            c_nf_val = ws.cell(row=r_idx, column=2)
            c_nf_val.font = font_body
            if c_nf_val.value is not None:
                c_nf_val.number_format = accounting_format
                c_nf_val.alignment = align_right
                
            # Devolução Valor (Col 4)
            c_dev_val = ws.cell(row=r_idx, column=4)
            c_dev_val.font = font_body
            if c_dev_val.value is not None:
                c_dev_val.number_format = accounting_format
                c_dev_val.alignment = align_right
                
            # Devolução Código (Col 5)
            cell_dev = ws.cell(row=r_idx, column=5)
            cell_dev.font = font_body
            cell_dev.number_format = '@'
            cell_dev.alignment = align_left
            
            # Abatimento Código (Col 9)
            cell_ab = ws.cell(row=r_idx, column=9)
            cell_ab.font = font_body
            cell_ab.number_format = '@'
            cell_ab.alignment = align_left
            
            # Abatimento Valor (Col 10)
            c_ab_val = ws.cell(row=r_idx, column=10)
            c_ab_val.font = font_body
            if c_ab_val.value is not None:
                c_ab_val.number_format = accounting_format
                c_ab_val.alignment = align_right

        # Format Soma total (Col 12, Row 2)
        c_soma = ws.cell(row=2, column=12)
        c_soma.font = font_body
        c_soma.number_format = accounting_format
        c_soma.alignment = align_right

        # Column widths
        ws.column_dimensions['A'].width = 16
        ws.column_dimensions['B'].width = 16
        ws.column_dimensions['C'].width = 5
        ws.column_dimensions['D'].width = 16
        ws.column_dimensions['E'].width = 16
        ws.column_dimensions['F'].width = 5
        ws.column_dimensions['G'].width = 5
        ws.column_dimensions['H'].width = 5
        ws.column_dimensions['I'].width = 16
        ws.column_dimensions['J'].width = 16
        ws.column_dimensions['K'].width = 5
        ws.column_dimensions['L'].width = 20

        # Save to buffer
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = file.filename.rsplit('.', 1)[0] + "_extraido.xlsx"
        headers_response = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers_response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/atacadao/conciliar")
async def conciliar_atacadao(
    html_file: UploadFile = File(...),
    csv_file: UploadFile = File(...)
):
    if not html_file.filename or not csv_file.filename:
        raise HTTPException(status_code=400, detail="Arquivos inválidos")
        
    try:
        # 1. Parse HTML file
        html_bytes = await html_file.read()
        html_content = html_bytes.decode('utf-8', errors='ignore')
        
        parser = AtacadaoHTMLParser()
        parser.feed(html_content)
        
        invoices_html = []
        for table in parser.tables:
            if not table:
                continue
            headers = [h.strip() for h in table[0]]
            if 'N Fiscal' not in headers or 'Prorrog.' not in headers:
                continue
            
            n_fiscal_idx = headers.index('N Fiscal')
            prorrog_idx = headers.index('Prorrog.')
            
            for row in table[1:]:
                if len(row) <= max(n_fiscal_idx, prorrog_idx):
                    continue
                n_fiscal_raw = row[n_fiscal_idx].strip()
                prorrog_raw = row[prorrog_idx].strip()
                
                if not n_fiscal_raw or n_fiscal_raw.lower() == 'total' or 'total' in n_fiscal_raw.lower():
                    continue
                    
                # Trim leading 2 zeros (000017059 -> 0017059)
                n_fiscal_formatted = n_fiscal_raw[2:] if n_fiscal_raw.startswith('0000') else n_fiscal_raw
                
                invoices_html.append({
                    'raw_nf': n_fiscal_raw,
                    'nf': n_fiscal_formatted,
                    'prorrogacao': prorrog_raw
                })
                
        if not invoices_html:
            raise HTTPException(
                status_code=400,
                detail="Nenhum registro de prorrogação encontrado no arquivo HTML informado."
            )
            
        # 2. Parse CSV/Excel file
        csv_bytes = await csv_file.read()
        
        import io
        import pandas as pd
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill
        import datetime

        # Load dynamic CSV/Excel
        try:
            df_csv = pd.read_excel(io.BytesIO(csv_bytes), header=None)
        except Exception:
            csv_text = csv_bytes.decode('utf-8', errors='ignore')
            sep = ';' if ';' in csv_text else ','
            df_csv = pd.read_csv(io.StringIO(csv_text), sep=sep, header=None)
            
        # Process and filter CSV data:
        # Col A (0): filter only 104
        # Col D (3): invoice number
        # Col P (15): due date (data de vencimento)
        csv_data_by_int = {}
        for idx, row in df_csv.iterrows():
            if len(row) < 16:
                continue
            val_a = str(row[0]).strip().split('.')[0]
            if val_a != '104':
                continue
            val_b = str(row[1]).strip().upper()
            if val_b != 'DP':
                continue
            val_d = str(row[3]).strip().split('.')[0]
            val_p = str(row[15]).strip()
            
            # Remove time component if present
            if ' ' in val_p:
                val_p = val_p.split()[0]
                
            try:
                csv_data_by_int[int(val_d)] = val_p
            except ValueError:
                continue
                
        # Helper to parse dates
        def parse_date(date_str):
            if not date_str:
                return None
            date_str = str(date_str).strip()
            for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d/%m/%y', '%Y/%m/%d %H:%M:%S', '%d/%m/%Y %H:%M:%S'):
                try:
                    return datetime.datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            return date_str

        def format_date_to_br(date_str):
            if not date_str:
                return ""
            d = parse_date(date_str)
            if isinstance(d, datetime.date):
                return d.strftime('%d/%m/%Y')
            return str(date_str)

        # 3. Create Excel workbook with two sheets
        wb = openpyxl.Workbook()

        # Sheet 1: Prorrogações Atacadão
        ws1 = wb.active
        ws1.title = "Prorrogações Atacadão"
        ws1.views.sheetView[0].showGridLines = True

        ws1.cell(row=1, column=1, value="Nota Fiscal")
        ws1.cell(row=1, column=2, value="Data de Prorrogação")

        for i, inv in enumerate(invoices_html):
            row_num = i + 2
            ws1.cell(row=row_num, column=1, value=inv['nf'])
            ws1.cell(row=row_num, column=2, value=format_date_to_br(inv['prorrogacao']))

        # Sheet 2: Conciliação
        ws2 = wb.create_sheet(title="Conciliação")
        ws2.views.sheetView[0].showGridLines = True

        ws2.cell(row=1, column=1, value="Nota Fiscal")
        ws2.cell(row=1, column=2, value="Data HTML (Prorrogação)")
        ws2.cell(row=1, column=3, value="Data CSV (Vencimento)")
        ws2.cell(row=1, column=4, value="Status")

        # Fonts, alignments and colors
        font_header = Font(name='Calibri', size=11, bold=True)
        font_body = Font(name='Calibri', size=11, bold=False)
        align_left = Alignment(horizontal='left', vertical='center')
        align_center = Alignment(horizontal='center', vertical='center')
        
        fill_ok = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid") # soft green
        fill_div = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid") # soft orange

        # Format Sheet 1 Headers
        for col_idx in [1, 2]:
            cell = ws1.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.alignment = align_left

        # Format Sheet 1 Body
        for r_idx in range(2, len(invoices_html) + 2):
            c1 = ws1.cell(row=r_idx, column=1)
            c1.font = font_body
            c1.number_format = '@'
            c1.alignment = align_left
            
            c2 = ws1.cell(row=r_idx, column=2)
            c2.font = font_body
            c2.alignment = align_center

        ws1.column_dimensions['A'].width = 16
        ws1.column_dimensions['B'].width = 24

        # Conciliate and populate Sheet 2
        for i, inv in enumerate(invoices_html):
            row_num = i + 2
            nf_str = inv['nf']
            date_html_str = inv['prorrogacao']
            
            try:
                nf_int = int(inv['raw_nf'])
            except ValueError:
                nf_int = None
                
            date_csv_str = ""
            status = "Não encontrado no CSV"
            status_fill = None
            
            if nf_int is not None and nf_int in csv_data_by_int:
                date_csv_str = csv_data_by_int[nf_int]
                d_html = parse_date(date_html_str)
                d_csv = parse_date(date_csv_str)
                
                # Check for equivalence or string match
                if d_html and d_csv:
                    if d_html == d_csv:
                        status = "OK"
                        status_fill = fill_ok
                    else:
                        status = "Divergente"
                        status_fill = fill_div
                else:
                    if str(date_html_str).strip() == str(date_csv_str).strip():
                        status = "OK"
                        status_fill = fill_ok
                    else:
                        status = "Divergente"
                        status_fill = fill_div
                        
            ws2.cell(row=row_num, column=1, value=nf_str)
            ws2.cell(row=row_num, column=2, value=format_date_to_br(date_html_str))
            ws2.cell(row=row_num, column=3, value=format_date_to_br(date_csv_str))
            
            status_cell = ws2.cell(row=row_num, column=4, value=status)
            if status_fill:
                status_cell.fill = status_fill

        # Format Sheet 2 Headers
        for col_idx in [1, 2, 3, 4]:
            cell = ws2.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.alignment = align_left

        # Format Sheet 2 Body
        for r_idx in range(2, len(invoices_html) + 2):
            ws2.cell(row=r_idx, column=1).font = font_body
            ws2.cell(row=r_idx, column=1).number_format = '@'
            ws2.cell(row=r_idx, column=1).alignment = align_left
            
            ws2.cell(row=r_idx, column=2).font = font_body
            ws2.cell(row=r_idx, column=2).alignment = align_center
            
            ws2.cell(row=r_idx, column=3).font = font_body
            ws2.cell(row=r_idx, column=3).alignment = align_center
            
            ws2.cell(row=r_idx, column=4).font = font_body
            ws2.cell(row=r_idx, column=4).alignment = align_center

        ws2.column_dimensions['A'].width = 16
        ws2.column_dimensions['B'].width = 24
        ws2.column_dimensions['C'].width = 24
        ws2.column_dimensions['D'].width = 24

        # Save workbook to memory buffer
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = html_file.filename.rsplit('.', 1)[0] + "_conciliado.xlsx"
        headers_response = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers_response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sendas/conciliar")
async def conciliar_sendas(
    sendas_file: UploadFile = File(...),
    acr_file: UploadFile = File(...)
):
    if not sendas_file.filename or not acr_file.filename:
        raise HTTPException(status_code=400, detail="Arquivos inválidos")
        
    try:
        # Load Sendas file
        sendas_bytes = await sendas_file.read()
        import io
        import pandas as pd
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill
        import datetime

        try:
            df_sendas = pd.read_excel(io.BytesIO(sendas_bytes), header=None)
        except Exception:
            csv_text = sendas_bytes.decode('utf-8', errors='ignore')
            sep = ';' if ';' in csv_text else ','
            df_sendas = pd.read_csv(io.StringIO(csv_text), sep=sep, header=None)

        if df_sendas.shape[1] < 13:
            raise HTTPException(
                status_code=400,
                detail=f"O arquivo Sendas precisa ter pelo menos 13 colunas (até a coluna M). Colunas encontradas: {df_sendas.shape[1]}."
            )

        # Parse Sendas data
        h_col_idx = 7 # Column H
        m_col_idx = 12 # Column M
        
        invoices_sendas = []
        for idx, row in df_sendas.iterrows():
            val_h_raw = row[h_col_idx]
            val_m_raw = row[m_col_idx]
            
            if pd.isna(val_h_raw) or pd.isna(val_m_raw):
                continue
                
            val_h = str(val_h_raw).strip()
            if val_h.endswith('.0'):
                val_h = val_h[:-2]
                
            # Filter starts with 1 or 2 and ends with 2
            if val_h.startswith(('1', '2')) and val_h.endswith('2'):
                # Format: remove spaces, remove final '2', pad to 7 characters
                cleaned_h = val_h.replace(' ', '')
                if cleaned_h.endswith('2'):
                    cleaned_h = cleaned_h[:-1]
                formatted_nf = cleaned_h.zfill(7)
                
                date_m = str(val_m_raw).strip()
                if ' ' in date_m:
                    date_m = date_m.split()[0]
                    
                invoices_sendas.append({
                    'raw_nf': val_h,
                    'nf': formatted_nf,
                    'vencimento': date_m
                })
                
        if not invoices_sendas:
            raise HTTPException(
                status_code=400,
                detail="Nenhum registro correspondente ao padrão Sendas foi encontrado na coluna H."
            )

        # Load ACR file
        acr_bytes = await acr_file.read()
        try:
            df_acr = pd.read_excel(io.BytesIO(acr_bytes), header=None)
        except Exception:
            csv_text = acr_bytes.decode('utf-8', errors='ignore')
            sep = ';' if ';' in csv_text else ','
            df_acr = pd.read_csv(io.StringIO(csv_text), sep=sep, header=None)

        if df_acr.shape[1] < 16:
            raise HTTPException(
                status_code=400,
                detail=f"O arquivo ACR precisa ter pelo menos 16 colunas (até a coluna P). Colunas encontradas: {df_acr.shape[1]}."
            )

        # Parse ACR data
        d_col_idx = 3 # Column D
        p_col_idx = 15 # Column P
        
        acr_data_by_int = {}
        for idx, row in df_acr.iterrows():
            val_d_raw = row[d_col_idx]
            val_p_raw = row[p_col_idx]
            
            if pd.isna(val_d_raw) or pd.isna(val_p_raw):
                continue
                
            val_d = str(val_d_raw).strip().split('.')[0]
            val_p = str(val_p_raw).strip()
            if ' ' in val_p:
                val_p = val_p.split()[0]
                
            try:
                acr_data_by_int[int(val_d)] = val_p
            except ValueError:
                continue

        # Helper to parse dates
        def parse_date(date_str):
            if not date_str:
                return None
            date_str = str(date_str).strip()
            for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d/%m/%y', '%Y/%m/%d %H:%M:%S', '%d/%m/%Y %H:%M:%S'):
                try:
                    return datetime.datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            return date_str

        def format_date_to_br(date_str):
            if not date_str:
                return ""
            d = parse_date(date_str)
            if isinstance(d, datetime.date):
                return d.strftime('%d/%m/%Y')
            return str(date_str)

        # Create Workbook
        wb = openpyxl.Workbook()
        
        # Tab 1
        ws1 = wb.active
        ws1.title = "Prorrogações Sendas"
        ws1.views.sheetView[0].showGridLines = True
        
        ws1.cell(row=1, column=1, value="Nota Fiscal")
        ws1.cell(row=1, column=2, value="Data de Vencimento")
        
        for i, inv in enumerate(invoices_sendas):
            row_num = i + 2
            ws1.cell(row=row_num, column=1, value=inv['nf'])
            ws1.cell(row=row_num, column=2, value=format_date_to_br(inv['vencimento']))
            
        # Tab 2
        ws2 = wb.create_sheet(title="Conciliação")
        ws2.views.sheetView[0].showGridLines = True
        
        ws2.cell(row=1, column=1, value="Nota Fiscal")
        ws2.cell(row=1, column=2, value="Data Sendas (Vencimento)")
        ws2.cell(row=1, column=3, value="Data ACR (Vencimento)")
        ws2.cell(row=1, column=4, value="Status")

        # Fonts, alignments and colors
        font_header = Font(name='Calibri', size=11, bold=True)
        font_body = Font(name='Calibri', size=11, bold=False)
        align_left = Alignment(horizontal='left', vertical='center')
        align_center = Alignment(horizontal='center', vertical='center')
        
        fill_ok = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
        fill_div = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")

        # Format Tab 1 Headers
        for col_idx in [1, 2]:
            cell = ws1.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.alignment = align_left

        # Format Tab 1 Body
        for r_idx in range(2, len(invoices_sendas) + 2):
            c1 = ws1.cell(row=r_idx, column=1)
            c1.font = font_body
            c1.number_format = '@'
            c1.alignment = align_left
            
            c2 = ws1.cell(row=r_idx, column=2)
            c2.font = font_body
            c2.alignment = align_center

        ws1.column_dimensions['A'].width = 16
        ws1.column_dimensions['B'].width = 24

        # Conciliate
        for i, inv in enumerate(invoices_sendas):
            row_num = i + 2
            nf_str = inv['nf']
            date_sendas_str = inv['vencimento']
            
            try:
                raw_nf_cleaned = inv['raw_nf'].replace(' ', '')
                if raw_nf_cleaned.endswith('2'):
                    raw_nf_cleaned = raw_nf_cleaned[:-1]
                nf_int = int(raw_nf_cleaned)
            except ValueError:
                nf_int = None
                
            date_acr_str = ""
            status = "Não encontrado no ACR"
            status_fill = None
            
            if nf_int is not None and nf_int in acr_data_by_int:
                date_acr_str = acr_data_by_int[nf_int]
                d_sendas = parse_date(date_sendas_str)
                d_acr = parse_date(date_acr_str)
                
                if d_sendas and d_acr:
                    if d_sendas == d_acr:
                        status = "OK"
                        status_fill = fill_ok
                    else:
                        status = "Divergente"
                        status_fill = fill_div
                else:
                    if str(date_sendas_str).strip() == str(date_acr_str).strip():
                        status = "OK"
                        status_fill = fill_ok
                    else:
                        status = "Divergente"
                        status_fill = fill_div
                        
            ws2.cell(row=row_num, column=1, value=nf_str)
            ws2.cell(row=row_num, column=2, value=format_date_to_br(date_sendas_str))
            ws2.cell(row=row_num, column=3, value=format_date_to_br(date_acr_str))
            
            status_cell = ws2.cell(row=row_num, column=4, value=status)
            if status_fill:
                status_cell.fill = status_fill

        # Format Tab 2 Headers
        for col_idx in [1, 2, 3, 4]:
            cell = ws2.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.alignment = align_left

        # Format Tab 2 Body
        for r_idx in range(2, len(invoices_sendas) + 2):
            ws2.cell(row=r_idx, column=1).font = font_body
            ws2.cell(row=r_idx, column=1).number_format = '@'
            ws2.cell(row=r_idx, column=1).alignment = align_left
            
            ws2.cell(row=r_idx, column=2).font = font_body
            ws2.cell(row=r_idx, column=2).alignment = align_center
            
            ws2.cell(row=r_idx, column=3).font = font_body
            ws2.cell(row=r_idx, column=3).alignment = align_center
            
            ws2.cell(row=r_idx, column=4).font = font_body
            ws2.cell(row=r_idx, column=4).alignment = align_center

        ws2.column_dimensions['A'].width = 16
        ws2.column_dimensions['B'].width = 24
        ws2.column_dimensions['C'].width = 24
        ws2.column_dimensions['D'].width = 24

        # Save Workbook
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = sendas_file.filename.rsplit('.', 1)[0] + "_conciliado.xlsx"
        headers_response = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers_response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/martminas/conciliar")
async def conciliar_martminas(
    martminas_file: UploadFile = File(...),
    acr_file: UploadFile = File(...)
):
    if not martminas_file.filename or not acr_file.filename:
        raise HTTPException(status_code=400, detail="Arquivos inválidos")
        
    try:
        # Load Mart Minas file
        martminas_bytes = await martminas_file.read()
        import io
        import pandas as pd
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill
        import datetime

        try:
            df_mm = pd.read_excel(io.BytesIO(martminas_bytes), header=None)
        except Exception:
            csv_text = martminas_bytes.decode('utf-8', errors='ignore')
            sep = ';' if ';' in csv_text else ','
            df_mm = pd.read_csv(io.StringIO(csv_text), sep=sep, header=None)

        if df_mm.shape[1] < 5:
            raise HTTPException(
                status_code=400,
                detail=f"O arquivo Mart Minas precisa ter pelo menos 5 colunas (até a coluna E). Colunas encontradas: {df_mm.shape[1]}."
            )

        # Parse Mart Minas data
        # Col E (4): nro documento
        # Col D (3): vencimento
        e_col_idx = 4
        d_col_idx = 3
        
        invoices_mm = []
        for idx, row in df_mm.iterrows():
            val_e_raw = row[e_col_idx]
            val_d_raw = row[d_col_idx]
            
            if pd.isna(val_e_raw) or pd.isna(val_d_raw):
                continue
                
            val_e = str(val_e_raw).strip()
            if val_e.endswith('.0'):
                val_e = val_e[:-2]
                
            # Skip header rows or non-numeric document numbers
            try:
                val_e_clean = val_e.replace(' ', '')
                if not val_e_clean:
                    continue
                int(val_e_clean)
            except ValueError:
                continue
                
            # Formatting: zfill to 7 characters
            formatted_nf = val_e.zfill(7)
            
            date_d = str(val_d_raw).strip()
            if ' ' in date_d:
                date_d = date_d.split()[0]
                
            invoices_mm.append({
                'raw_nf': val_e,
                'nf': formatted_nf,
                'vencimento': date_d
            })
            
        if not invoices_mm:
            raise HTTPException(
                status_code=400,
                detail="Nenhum registro correspondente ao padrão Mart Minas foi encontrado na coluna E."
            )

        # Load ACR file
        acr_bytes = await acr_file.read()
        try:
            df_acr = pd.read_excel(io.BytesIO(acr_bytes), header=None)
        except Exception:
            csv_text = acr_bytes.decode('utf-8', errors='ignore')
            sep = ';' if ';' in csv_text else ','
            df_acr = pd.read_csv(io.StringIO(csv_text), sep=sep, header=None)

        if df_acr.shape[1] < 16:
            raise HTTPException(
                status_code=400,
                detail=f"O arquivo ACR precisa ter pelo menos 16 colunas (até a coluna P). Colunas encontradas: {df_acr.shape[1]}."
            )

        # Parse ACR data
        acr_d_col_idx = 3 # Column D
        acr_p_col_idx = 15 # Column P
        
        acr_data_by_int = {}
        for idx, row in df_acr.iterrows():
            val_d_raw = row[acr_d_col_idx]
            val_p_raw = row[acr_p_col_idx]
            
            if pd.isna(val_d_raw) or pd.isna(val_p_raw):
                continue
                
            val_d = str(val_d_raw).strip().split('.')[0]
            val_p = str(val_p_raw).strip()
            if ' ' in val_p:
                val_p = val_p.split()[0]
                
            try:
                acr_data_by_int[int(val_d)] = val_p
            except ValueError:
                continue

        # Helper to parse dates
        def parse_date(date_str):
            if not date_str:
                return None
            date_str = str(date_str).strip()
            for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d/%m/%y', '%Y/%m/%d %H:%M:%S', '%d/%m/%Y %H:%M:%S'):
                try:
                    return datetime.datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            return date_str

        def format_date_to_br(date_str):
            if not date_str:
                return ""
            d = parse_date(date_str)
            if isinstance(d, datetime.date):
                return d.strftime('%d/%m/%Y')
            return str(date_str)

        # Create Workbook
        wb = openpyxl.Workbook()
        
        # Tab 1
        ws1 = wb.active
        ws1.title = "Prorrogações Mart Minas"
        ws1.views.sheetView[0].showGridLines = True
        
        ws1.cell(row=1, column=1, value="Nota Fiscal")
        ws1.cell(row=1, column=2, value="Vencimento")
        
        for i, inv in enumerate(invoices_mm):
            row_num = i + 2
            ws1.cell(row=row_num, column=1, value=inv['nf'])
            ws1.cell(row=row_num, column=2, value=format_date_to_br(inv['vencimento']))
            
        # Tab 2
        ws2 = wb.create_sheet(title="Conciliação")
        ws2.views.sheetView[0].showGridLines = True
        
        ws2.cell(row=1, column=1, value="Nota Fiscal")
        ws2.cell(row=1, column=2, value="Vencimento Mart Minas")
        ws2.cell(row=1, column=3, value="Vencimento ACR")
        ws2.cell(row=1, column=4, value="Status")

        # Fonts, alignments and colors
        font_header = Font(name='Calibri', size=11, bold=True)
        font_body = Font(name='Calibri', size=11, bold=False)
        align_left = Alignment(horizontal='left', vertical='center')
        align_center = Alignment(horizontal='center', vertical='center')
        
        fill_ok = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
        fill_div = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")

        # Format Tab 1 Headers
        for col_idx in [1, 2]:
            cell = ws1.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.alignment = align_left

        # Format Tab 1 Body
        for r_idx in range(2, len(invoices_mm) + 2):
            c1 = ws1.cell(row=r_idx, column=1)
            c1.font = font_body
            c1.number_format = '@'
            c1.alignment = align_left
            
            c2 = ws1.cell(row=r_idx, column=2)
            c2.font = font_body
            c2.alignment = align_center

        ws1.column_dimensions['A'].width = 16
        ws1.column_dimensions['B'].width = 24

        # Conciliate
        for i, inv in enumerate(invoices_mm):
            row_num = i + 2
            nf_str = inv['nf']
            date_mm_str = inv['vencimento']
            
            try:
                raw_nf_cleaned = inv['raw_nf'].replace(' ', '')
                nf_int = int(raw_nf_cleaned)
            except ValueError:
                nf_int = None
                
            date_acr_str = ""
            status = "Não encontrado no ACR"
            status_fill = None
            
            if nf_int is not None and nf_int in acr_data_by_int:
                date_acr_str = acr_data_by_int[nf_int]
                d_mm = parse_date(date_mm_str)
                d_acr = parse_date(date_acr_str)
                
                if d_mm and d_acr:
                    if d_mm == d_acr:
                        status = "OK"
                        status_fill = fill_ok
                    else:
                        status = "Divergente"
                        status_fill = fill_div
                else:
                    if str(date_mm_str).strip() == str(date_acr_str).strip():
                        status = "OK"
                        status_fill = fill_ok
                    else:
                        status = "Divergente"
                        status_fill = fill_div
                        
            ws2.cell(row=row_num, column=1, value=nf_str)
            ws2.cell(row=row_num, column=2, value=format_date_to_br(date_mm_str))
            ws2.cell(row=row_num, column=3, value=format_date_to_br(date_acr_str))
            
            status_cell = ws2.cell(row=row_num, column=4, value=status)
            if status_fill:
                status_cell.fill = status_fill

        # Format Tab 2 Headers
        for col_idx in [1, 2, 3, 4]:
            cell = ws2.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.alignment = align_left

        # Format Tab 2 Body
        for r_idx in range(2, len(invoices_mm) + 2):
            ws2.cell(row=r_idx, column=1).font = font_body
            ws2.cell(row=r_idx, column=1).number_format = '@'
            ws2.cell(row=r_idx, column=1).alignment = align_left
            
            ws2.cell(row=r_idx, column=2).font = font_body
            ws2.cell(row=r_idx, column=2).alignment = align_center
            
            ws2.cell(row=r_idx, column=3).font = font_body
            ws2.cell(row=r_idx, column=3).alignment = align_center
            
            ws2.cell(row=r_idx, column=4).font = font_body
            ws2.cell(row=r_idx, column=4).alignment = align_center

        ws2.column_dimensions['A'].width = 16
        ws2.column_dimensions['B'].width = 24
        ws2.column_dimensions['C'].width = 24
        ws2.column_dimensions['D'].width = 24

        # Save Workbook
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = martminas_file.filename.rsplit('.', 1)[0] + "_conciliado.xlsx"
        headers_response = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers_response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/savegnago/conciliar")
async def conciliar_savegnago(
    savegnago_file: UploadFile = File(...),
    acr_file: UploadFile = File(...)
):
    if not savegnago_file.filename or not acr_file.filename:
        raise HTTPException(status_code=400, detail="Arquivos inválidos")
        
    try:
        # Load Savegnago file
        savegnago_bytes = await savegnago_file.read()
        import io
        import pandas as pd
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill
        import datetime
        import re

        try:
            df_sav = pd.read_excel(io.BytesIO(savegnago_bytes), header=None)
        except Exception:
            csv_text = savegnago_bytes.decode('utf-8', errors='ignore')
            sep = ';' if ';' in csv_text else ','
            df_sav = pd.read_csv(io.StringIO(csv_text), sep=sep, header=None)

        if df_sav.shape[1] < 9:
            raise HTTPException(
                status_code=400,
                detail=f"O arquivo Savegnago precisa ter pelo menos 9 colunas (até a coluna I). Colunas encontradas: {df_sav.shape[1]}."
            )

        # Helper to parse dates
        def parse_date(date_str):
            if not date_str:
                return None
            date_str = str(date_str).strip()
            for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d/%m/%y', '%Y/%m/%d %H:%M:%S', '%d/%m/%Y %H:%M:%S'):
                try:
                    return datetime.datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            return date_str

        # Helper to adjust Savegnago date
        def adjust_savegnago_date(d_val):
            d = parse_date(d_val)
            if not isinstance(d, datetime.date):
                return d_val
            day = d.day
            month = d.month
            year = d.year
            
            if day == 31 or (1 <= day <= 9):
                new_day = 10
            elif 11 <= day <= 19:
                new_day = 20
            elif 21 <= day <= 29:
                new_day = 30
            else:
                new_day = day
                
            try:
                adjusted = datetime.date(year, month, new_day)
                return adjusted
            except ValueError:
                if month == 2:
                    is_leap = (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0))
                    last_day = 29 if is_leap else 28
                    return datetime.date(year, month, last_day)
                return d

        def format_date_to_br(date_val):
            if not date_val:
                return ""
            if isinstance(date_val, datetime.date):
                return date_val.strftime('%d/%m/%Y')
            d = parse_date(date_val)
            if isinstance(d, datetime.date):
                return d.strftime('%d/%m/%Y')
            return str(date_val)

        # Parse Savegnago data
        # Col D (3): Nota Fiscal
        # Col I (8): Vencimento
        d_col_idx = 3
        i_col_idx = 8
        
        invoices_sav = []
        for idx, row in df_sav.iterrows():
            val_d_raw = row[d_col_idx]
            val_i_raw = row[i_col_idx]
            
            if pd.isna(val_d_raw) or pd.isna(val_i_raw):
                continue
                
            val_d_str = str(val_d_raw).strip()
            if val_d_str.endswith('.0'):
                val_d_str = val_d_str[:-2]
                
            segment = val_d_str.split('-')[0]
            clean_segment = re.sub(r'^[a-zA-Z]+', '', segment)
            
            try:
                int(clean_segment)
            except ValueError:
                continue
                
            formatted_nf = clean_segment.zfill(7)
            
            date_raw = str(val_i_raw).strip()
            if ' ' in date_raw:
                date_raw = date_raw.split()[0]
                
            adjusted_date = adjust_savegnago_date(date_raw)
            
            invoices_sav.append({
                'raw_nf': clean_segment,
                'nf': formatted_nf,
                'vencimento': adjusted_date
            })
            
        if not invoices_sav:
            raise HTTPException(
                status_code=400,
                detail="Nenhum registro correspondente ao padrão Savegnago foi encontrado na coluna D."
            )

        # Load ACR file
        acr_bytes = await acr_file.read()
        try:
            df_acr = pd.read_excel(io.BytesIO(acr_bytes), header=None)
        except Exception:
            csv_text = acr_bytes.decode('utf-8', errors='ignore')
            sep = ';' if ';' in csv_text else ','
            df_acr = pd.read_csv(io.StringIO(csv_text), sep=sep, header=None)

        if df_acr.shape[1] < 16:
            raise HTTPException(
                status_code=400,
                detail=f"O arquivo ACR precisa ter pelo menos 16 colunas (até a coluna P). Colunas encontradas: {df_acr.shape[1]}."
            )

        # Parse ACR data
        acr_d_col_idx = 3 # Column D
        acr_p_col_idx = 15 # Column P
        
        acr_data_by_int = {}
        for idx, row in df_acr.iterrows():
            val_d_raw = row[acr_d_col_idx]
            val_p_raw = row[acr_p_col_idx]
            
            if pd.isna(val_d_raw) or pd.isna(val_p_raw):
                continue
                
            val_d = str(val_d_raw).strip().split('.')[0]
            val_p = str(val_p_raw).strip()
            if ' ' in val_p:
                val_p = val_p.split()[0]
                
            try:
                acr_data_by_int[int(val_d)] = val_p
            except ValueError:
                continue

        # Create Workbook
        wb = openpyxl.Workbook()
        
        # Tab 1
        ws1 = wb.active
        ws1.title = "Prorrogações Savegnago"
        ws1.views.sheetView[0].showGridLines = True
        
        ws1.cell(row=1, column=1, value="Nota Fiscal")
        ws1.cell(row=1, column=2, value="Vencimento")
        
        for i, inv in enumerate(invoices_sav):
            row_num = i + 2
            ws1.cell(row=row_num, column=1, value=inv['nf'])
            ws1.cell(row=row_num, column=2, value=format_date_to_br(inv['vencimento']))
            
        # Tab 2
        ws2 = wb.create_sheet(title="Conciliação")
        ws2.views.sheetView[0].showGridLines = True
        
        ws2.cell(row=1, column=1, value="Nota Fiscal")
        ws2.cell(row=1, column=2, value="Vencimento Savegnago")
        ws2.cell(row=1, column=3, value="Vencimento ACR")
        ws2.cell(row=1, column=4, value="Status")

        # Fonts, alignments and colors
        font_header = Font(name='Calibri', size=11, bold=True)
        font_body = Font(name='Calibri', size=11, bold=False)
        align_left = Alignment(horizontal='left', vertical='center')
        align_center = Alignment(horizontal='center', vertical='center')
        
        fill_ok = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
        fill_div = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")

        # Format Tab 1 Headers
        for col_idx in [1, 2]:
            cell = ws1.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.alignment = align_left

        # Format Tab 1 Body
        for r_idx in range(2, len(invoices_sav) + 2):
            c1 = ws1.cell(row=r_idx, column=1)
            c1.font = font_body
            c1.number_format = '@'
            c1.alignment = align_left
            
            c2 = ws1.cell(row=r_idx, column=2)
            c2.font = font_body
            c2.alignment = align_center

        ws1.column_dimensions['A'].width = 16
        ws1.column_dimensions['B'].width = 24

        # Conciliate
        for i, inv in enumerate(invoices_sav):
            row_num = i + 2
            nf_str = inv['nf']
            date_sav_val = inv['vencimento']
            
            try:
                nf_int = int(inv['raw_nf'])
            except ValueError:
                nf_int = None
                
            date_acr_str = ""
            status = "Não encontrado no ACR"
            status_fill = None
            
            if nf_int is not None and nf_int in acr_data_by_int:
                date_acr_str = acr_data_by_int[nf_int]
                
                if isinstance(date_sav_val, datetime.date):
                    d_sav = date_sav_val
                else:
                    d_sav = parse_date(date_sav_val)
                    
                d_acr = parse_date(date_acr_str)
                
                if d_sav and d_acr:
                    if d_sav == d_acr:
                        status = "OK"
                        status_fill = fill_ok
                    else:
                        status = "Divergente"
                        status_fill = fill_div
                else:
                    if str(format_date_to_br(date_sav_val)).strip() == str(format_date_to_br(date_acr_str)).strip():
                        status = "OK"
                        status_fill = fill_ok
                    else:
                        status = "Divergente"
                        status_fill = fill_div
                        
            ws2.cell(row=row_num, column=1, value=nf_str)
            ws2.cell(row=row_num, column=2, value=format_date_to_br(date_sav_val))
            ws2.cell(row=row_num, column=3, value=format_date_to_br(date_acr_str))
            
            status_cell = ws2.cell(row=row_num, column=4, value=status)
            if status_fill:
                status_cell.fill = status_fill

        # Format Tab 2 Headers
        for col_idx in [1, 2, 3, 4]:
            cell = ws2.cell(row=1, column=col_idx)
            cell.font = font_header
            cell.alignment = align_left

        # Format Tab 2 Body
        for r_idx in range(2, len(invoices_sav) + 2):
            ws2.cell(row=r_idx, column=1).font = font_body
            ws2.cell(row=r_idx, column=1).number_format = '@'
            ws2.cell(row=r_idx, column=1).alignment = align_left
            
            ws2.cell(row=r_idx, column=2).font = font_body
            ws2.cell(row=r_idx, column=2).alignment = align_center
            
            ws2.cell(row=r_idx, column=3).font = font_body
            ws2.cell(row=r_idx, column=3).alignment = align_center
            
            ws2.cell(row=r_idx, column=4).font = font_body
            ws2.cell(row=r_idx, column=4).alignment = align_center

        ws2.column_dimensions['A'].width = 16
        ws2.column_dimensions['B'].width = 24
        ws2.column_dimensions['C'].width = 24
        ws2.column_dimensions['D'].width = 24

        # Save Workbook
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = savegnago_file.filename.rsplit('.', 1)[0] + "_conciliado.xlsx"
        headers_response = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers_response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


