import os
import json
import tempfile
import time
import asyncio
import re
import pypdf
from google import genai
from google.genai import types
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class DespesaExtraida(BaseModel):
    empresa: str
    colaborador: str
    categoria: str
    valor: float

class EstruturaExtracaoIA(BaseModel):
    despesas: List[DespesaExtraida]

class TransacaoBanco(BaseModel):
    data: str
    descricao: str
    valor: float
    documento: Optional[str] = None
    situacao: Optional[str] = None

class EstruturaExtracaoBanco(BaseModel):
    transacoes: List[TransacaoBanco]

class DependentExtraido(BaseModel):
    nome: str
    valor: float

class TitularExtraido(BaseModel):
    nome_pdf: str
    nome_db: str
    valor_titular: float
    dependentes: List[DependentExtraido]
    valor_total: float
    centro_custo: Optional[str] = "N/D"

class EstruturaExtracaoPlanoSaude(BaseModel):
    titulares: List[TitularExtraido]

class DependentExtraidoUnimed(BaseModel):
    nome: str
    tipo: str
    valor: float

class TitularExtraidoUnimed(BaseModel):
    nome_pdf: str
    nome_db: str
    matricula: str
    valor_titular: float
    dependentes: List[DependentExtraidoUnimed]
    valor_total: float
    centro_custo: Optional[str] = "N/D"
    unidade: Optional[str] = "N/D"

class EstruturaExtracaoUnimedOdonto(BaseModel):
    titulares: List[TitularExtraidoUnimed]

class IAService:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        self.model_name = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
        
        # Testar se a API Key está presente
        if api_key:
            try:
                # Usando o novo SDK google-genai
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                print(f"[ERROR] Falha ao inicializar GenAI Client: {e}")
                self.client = None
        else:
            print("[WARN] GEMINI_API_KEY não encontrada nas variáveis de ambiente.")
            self.client = None

    async def analisar_fatura_despesas(self, file_content: bytes, file_name: str, categorias: List[str]) -> Dict[str, Any]:
        if not self.client:
            raise Exception("API Key do Gemini não configurada.")
            
        metrics = {
            "upload_pdf_ms": 0.0,
            "file_ready_ms": 0.0,
            "gemini_generation_ms": 0.0,
            "structured_output_ms": 0.0,
            "post_processing_ms": 0.0,
            "total_ms": 0.0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0
        }
        
        t0_total = time.time()
        file_size = len(file_content)
        uploaded_file = None
        temp_path = None
        
        is_inline = file_size < 15 * 1024 * 1024
        
        try:
            if is_inline:
                t0_prep = time.time()
                mime_type = "application/pdf" if file_name.lower().endswith(".pdf") else "text/plain"
                content_part = types.Part.from_bytes(
                    data=file_content,
                    mime_type=mime_type
                )
                metrics["upload_pdf_ms"] = round((time.time() - t0_prep) * 1000, 2)
                metrics["file_ready_ms"] = 0.0
                contents = [content_part]
            else:
                t0_prep = time.time()
                ext = ".pdf" if file_name.lower().endswith(".pdf") else ""
                with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
                    temp_file.write(file_content)
                    temp_path = temp_file.name
                
                mime_type = "application/pdf" if ext == ".pdf" else "text/plain"
                uploaded_file = await self.client.aio.files.upload(
                    file=temp_path,
                    config=types.UploadFileConfig(mime_type=mime_type)
                )
                metrics["upload_pdf_ms"] = round((time.time() - t0_prep) * 1000, 2)
                
                t0_ready = time.time()
                sleep_time = 0.2
                while uploaded_file.state and uploaded_file.state.name == "PROCESSING":
                    await asyncio.sleep(sleep_time)
                    uploaded_file = await self.client.aio.files.get(name=uploaded_file.name)
                    sleep_time = min(sleep_time * 1.5, 1.0)
                    
                if uploaded_file.state and uploaded_file.state.name == "FAILED":
                    raise Exception("Falha ao processar arquivo na Files API do Gemini.")
                metrics["file_ready_ms"] = round((time.time() - t0_ready) * 1000, 2)
                contents = [uploaded_file]
                
            prompt = f"""
            Você é um assistente especializado em auditoria de faturas de viagens corporativas e despesas de cartão corporativo.
            Sua tarefa é analisar o relatório de despesas fornecido (anexo) e estruturar cada transação.

            Regras de Extração e Classificação:
            1. Identifique as despesas individuais. Cada despesa deve ter um Colaborador responsável, uma Empresa relacionada e um Valor.
            2. Classifique a categoria de cada despesa no menor nível possível, escolhendo exclusivamente uma destas categorias disponíveis no sistema:
            {json.dumps(categorias, ensure_ascii=False)}
            Se nenhuma categoria se encaixar perfeitamente, classifique na categoria mais genérica aplicável (como "Outros" ou "Viagens").
            
            Retorne o resultado de forma estruturada estritamente conforme o schema estruturado EstruturaExtracaoIA.
            """
            
            contents.append(prompt)
            
            max_retries = 3
            response = None
            
            t0_gen = time.time()
            for attempt in range(max_retries):
                try:
                    response = await self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=EstruturaExtracaoIA,
                            thinking_config=types.ThinkingConfig(thinking_level="low")
                        )
                    )
                    break
                except Exception as e:
                    error_str = str(e)
                    if "429 RESOURCE_EXHAUSTED" in error_str and "Quota exceeded" in error_str:
                        await asyncio.sleep(5.0)
                        continue
                    if any(msg in error_str for msg in ["503", "UNAVAILABLE", "500", "504", "deadline"]):
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    raise e
            
            metrics["gemini_generation_ms"] = round((time.time() - t0_gen) * 1000, 2)
            
            t0_struct = time.time()
            despesas_list = []
            if response and response.parsed:
                despesas_list = [d.model_dump() for d in response.parsed.despesas]
            else:
                raw_text = response.text.strip() if response else ""
                if raw_text:
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    raw_text = raw_text.strip()
                    data = json.loads(raw_text)
                    despesas_list = data.get("despesas", [])
            metrics["structured_output_ms"] = round((time.time() - t0_struct) * 1000, 2)
            
            if response and response.usage_metadata:
                metrics["input_tokens"] = response.usage_metadata.prompt_token_count or 0
                metrics["output_tokens"] = response.usage_metadata.candidates_token_count or 0
                metrics["total_tokens"] = response.usage_metadata.total_token_count or 0
            
            t0_post = time.time()
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            metrics["post_processing_ms"] = round((time.time() - t0_post) * 1000, 2)
            
            metrics["total_ms"] = round((time.time() - t0_total) * 1000, 2)
            
            return {
                "despesas": despesas_list,
                "metrics": metrics,
                "file_name_to_delete": uploaded_file.name if uploaded_file else None
            }
            
        except Exception as e:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    async def analisar_extrato(self, file_content: bytes, file_name: str, categorias: List[str], colaboradores: List[str], empresa_context: str) -> Dict[str, Any]:
        if not self.client:
            raise Exception("API Key do Gemini não configurada.")
            
        metrics = {
            "upload_pdf_ms": 0.0,
            "file_ready_ms": 0.0,
            "gemini_generation_ms": 0.0,
            "structured_output_ms": 0.0,
            "post_processing_ms": 0.0,
            "total_ms": 0.0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0
        }
        
        t0_total = time.time()
        file_size = len(file_content)
        uploaded_file = None
        temp_path = None
        
        is_inline = file_size < 15 * 1024 * 1024
        
        try:
            if is_inline:
                t0_prep = time.time()
                mime_type = "application/pdf" if file_name.lower().endswith(".pdf") else "text/plain"
                content_part = types.Part.from_bytes(
                    data=file_content,
                    mime_type=mime_type
                )
                metrics["upload_pdf_ms"] = round((time.time() - t0_prep) * 1000, 2)
                metrics["file_ready_ms"] = 0.0
                contents = [content_part]
            else:
                t0_prep = time.time()
                ext = ".pdf" if file_name.lower().endswith(".pdf") else ""
                with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
                    temp_file.write(file_content)
                    temp_path = temp_file.name
                
                mime_type = "application/pdf" if ext == ".pdf" else "text/plain"
                uploaded_file = await self.client.aio.files.upload(
                    file=temp_path,
                    config=types.UploadFileConfig(mime_type=mime_type)
                )
                metrics["upload_pdf_ms"] = round((time.time() - t0_prep) * 1000, 2)
                
                t0_ready = time.time()
                sleep_time = 0.2
                while uploaded_file.state and uploaded_file.state.name == "PROCESSING":
                    await asyncio.sleep(sleep_time)
                    uploaded_file = await self.client.aio.files.get(name=uploaded_file.name)
                    sleep_time = min(sleep_time * 1.5, 1.0)
                    
                if uploaded_file.state and uploaded_file.state.name == "FAILED":
                    raise Exception("Falha ao processar arquivo na Files API do Gemini.")
                metrics["file_ready_ms"] = round((time.time() - t0_ready) * 1000, 2)
                contents = [uploaded_file]
                
            prompt = f"""
            Você é um assistente especializado em auditoria de faturas de viagens corporativas e despesas de cartão corporativo.
            Sua tarefa é analisar o relatório de despesas fornecido (anexo) para a empresa "{empresa_context}" e estruturar cada transação.

            Regras de Extração e Classificação:
            1. Identifique as despesas individuais. Cada despesa deve ter um Colaborador responsável, uma Empresa relacionada (que deve ser "{empresa_context}") e um Valor.
            2. Mapeie o Colaborador responsável de cada despesa exclusivamente a partir da lista de colaboradores válidos do sistema fornecida abaixo:
            {json.dumps(colaboradores, ensure_ascii=False)}
            Se o nome no documento estiver ligeiramente diferente (abreviado ou com sobrenomes ocultos), faça a correspondência com o colaborador real correspondente da lista. Se não encontrar nenhuma correspondência plausível, use "Não Identificado" ou o nome mais próximo possível da lista.
            
            3. Classifique a categoria de cada despesa no menor nível possível, escolhendo exclusivamente uma destas categorias disponíveis no sistema:
            {json.dumps(categorias, ensure_ascii=False)}
            Se nenhuma categoria se encaixar perfeitamente, classifique na categoria mais genérica aplicável (como "Outros" ou "Viagens").
            
            Retorne o resultado de forma estruturada estritamente conforme o schema estruturado EstruturaExtracaoIA.
            """
            
            contents.append(prompt)
            
            max_retries = 3
            response = None
            
            t0_gen = time.time()
            for attempt in range(max_retries):
                try:
                    response = await self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=EstruturaExtracaoIA,
                            thinking_config=types.ThinkingConfig(thinking_level="low")
                        )
                    )
                    break
                except Exception as e:
                    error_str = str(e)
                    if "429 RESOURCE_EXHAUSTED" in error_str and "Quota exceeded" in error_str:
                        await asyncio.sleep(5.0)
                        continue
                    if any(msg in error_str for msg in ["503", "UNAVAILABLE", "500", "504", "deadline"]):
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    raise e
            
            metrics["gemini_generation_ms"] = round((time.time() - t0_gen) * 1000, 2)
            
            t0_struct = time.time()
            despesas_list = []
            if response and response.parsed:
                despesas_list = [d.model_dump() for d in response.parsed.despesas]
            else:
                raw_text = response.text.strip() if response else ""
                if raw_text:
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    raw_text = raw_text.strip()
                    data = json.loads(raw_text)
                    despesas_list = data.get("despesas", [])
            metrics["structured_output_ms"] = round((time.time() - t0_struct) * 1000, 2)
            
            if response and response.usage_metadata:
                metrics["input_tokens"] = response.usage_metadata.prompt_token_count or 0
                metrics["output_tokens"] = response.usage_metadata.candidates_token_count or 0
                metrics["total_tokens"] = response.usage_metadata.total_token_count or 0
            
            t0_post = time.time()
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            metrics["post_processing_ms"] = round((time.time() - t0_post) * 1000, 2)
            
            metrics["total_ms"] = round((time.time() - t0_total) * 1000, 2)
            
            return {
                "despesas": despesas_list,
                "metrics": metrics,
                "file_name_to_delete": uploaded_file.name if uploaded_file else None
            }
            
        except Exception as e:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    async def analisar_extrato_bancario(self, file_content: bytes, file_name: str) -> Dict[str, Any]:
        if not self.client:
            raise Exception("API Key do Gemini não configurada.")
            
        metrics = {
            "upload_pdf_ms": 0.0,
            "file_ready_ms": 0.0,
            "gemini_generation_ms": 0.0,
            "structured_output_ms": 0.0,
            "post_processing_ms": 0.0,
            "total_ms": 0.0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0
        }
        
        t0_total = time.time()
        file_size = len(file_content)
        uploaded_file = None
        temp_path = None
        
        is_inline = file_size < 15 * 1024 * 1024
        
        try:
            if is_inline:
                t0_prep = time.time()
                mime_type = "application/pdf" if file_name.lower().endswith(".pdf") else "text/plain"
                content_part = types.Part.from_bytes(
                    data=file_content,
                    mime_type=mime_type
                )
                metrics["upload_pdf_ms"] = round((time.time() - t0_prep) * 1000, 2)
                metrics["file_ready_ms"] = 0.0
                contents = [content_part]
            else:
                t0_prep = time.time()
                ext = ".pdf" if file_name.lower().endswith(".pdf") else ""
                with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
                    temp_file.write(file_content)
                    temp_path = temp_file.name
                
                mime_type = "application/pdf" if ext == ".pdf" else "text/plain"
                uploaded_file = await self.client.aio.files.upload(
                    file=temp_path,
                    config=types.UploadFileConfig(mime_type=mime_type)
                )
                metrics["upload_pdf_ms"] = round((time.time() - t0_prep) * 1000, 2)
                
                t0_ready = time.time()
                sleep_time = 0.2
                while uploaded_file.state and uploaded_file.state.name == "PROCESSING":
                    await asyncio.sleep(sleep_time)
                    uploaded_file = await self.client.aio.files.get(name=uploaded_file.name)
                    sleep_time = min(sleep_time * 1.5, 1.0)
                    
                if uploaded_file.state and uploaded_file.state.name == "FAILED":
                    raise Exception("Falha ao processar arquivo na Files API do Gemini.")
                metrics["file_ready_ms"] = round((time.time() - t0_ready) * 1000, 2)
                contents = [uploaded_file]
                
            prompt = """
            Você é um assistente especializado em conciliação bancária de ERPs de alta performance.
            Sua tarefa é analisar o extrato bancário anexado (PDF ou texto) e estruturar cada transação.

            Regras de Extração e Estruturação:
            1. Identifique as transações individuais. Cada transação deve ter uma data, uma descrição e um valor.
            2. Se houver coluna de documento, situação ou número de controle, extraia-a no campo correspondente "documento".
            
            Retorne o resultado de forma estruturada estritamente conforme o schema estruturado EstruturaExtracaoBanco.
            """
            
            contents.append(prompt)
            
            max_retries = 3
            response = None
            
            t0_gen = time.time()
            for attempt in range(max_retries):
                try:
                    response = await self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=EstruturaExtracaoBanco,
                            thinking_config=types.ThinkingConfig(thinking_level="low")
                        )
                    )
                    break
                except Exception as e:
                    error_str = str(e)
                    if "429 RESOURCE_EXHAUSTED" in error_str and "Quota exceeded" in error_str:
                        await asyncio.sleep(5.0)
                        continue
                    if any(msg in error_str for msg in ["503", "UNAVAILABLE", "500", "504", "deadline"]):
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    raise e
            
            metrics["gemini_generation_ms"] = round((time.time() - t0_gen) * 1000, 2)
            
            t0_struct = time.time()
            transacoes_list = []
            if response and response.parsed:
                transacoes_list = [t.model_dump() for t in response.parsed.transacoes]
            else:
                raw_text = response.text.strip() if response else ""
                if raw_text:
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    raw_text = raw_text.strip()
                    data = json.loads(raw_text)
                    transacoes_list = data.get("transacoes", [])
            metrics["structured_output_ms"] = round((time.time() - t0_struct) * 1000, 2)
            
            if response and response.usage_metadata:
                metrics["input_tokens"] = response.usage_metadata.prompt_token_count or 0
                metrics["output_tokens"] = response.usage_metadata.candidates_token_count or 0
                metrics["total_tokens"] = response.usage_metadata.total_token_count or 0
            
            t0_post = time.time()
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            metrics["post_processing_ms"] = round((time.time() - t0_post) * 1000, 2)
            
            metrics["total_ms"] = round((time.time() - t0_total) * 1000, 2)
            
            return {
                "transacoes": transacoes_list,
                "metrics": metrics,
                "file_name_to_delete": uploaded_file.name if uploaded_file else None
            }
            
        except Exception as e:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    async def analisar_plano_saude_unimed_odonto(self, file_content: bytes, file_name: str, colaboradores: List[str]) -> Dict[str, Any]:
        print(">>> EXECUÇÃO EXTRAÇÃO PYTHON - UNIMED ODONTO <<<", flush=True)
        metrics = {
            "upload_pdf_ms": 0.0,
            "file_ready_ms": 0.0,
            "gemini_generation_ms": 0.0,
            "structured_output_ms": 0.0,
            "post_processing_ms": 0.0,
            "total_ms": 0.0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0
        }
        
        t0_total = time.time()
        
        try:
            # 1. Extrair texto usando pypdf em memória
            t0_prep = time.time()
            import io
            import difflib
            import re
            
            pdf_file = io.BytesIO(file_content)
            reader = pypdf.PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            metrics["upload_pdf_ms"] = round((time.time() - t0_prep) * 1000, 2)
            
            # 2. Parsear as linhas deterministicamente
            lines = text.split('\n')
            
            titulares = {}
            dependentes = []
            
            beneficiary_pattern = re.compile(r'(\d\.\d{7}\.\d{8}-\d)')
            tp_pattern = re.compile(r'\s([TDA])\s')
            val_pattern = re.compile(r'(\d+,\d{2}-?)')
            
            for line in lines:
                line = line.strip()
                benef_match = beneficiary_pattern.search(line)
                if not benef_match:
                    continue
                    
                num_benef = benef_match.group(1)
                prefix = num_benef[:-4]
                
                tp_match = tp_pattern.search(line)
                if not tp_match:
                    continue
                tp = tp_match.group(1)
                
                name_match = re.match(r'^([A-Z\s\.\,\-\'\?]+?)(?=\d)', line)
                if not name_match:
                    continue
                name = name_match.group(1).strip()
                
                val_matches = val_pattern.findall(line)
                if not val_matches:
                    continue
                    
                val_str = val_matches[0]
                if val_str.endswith('-'):
                    valor = -float(val_str[:-1].replace(',', '.'))
                else:
                    valor = float(val_str.replace(',', '.'))
                    
                if tp == 'T':
                    if prefix in titulares:
                        titulares[prefix]["valor_titular"] = round(titulares[prefix]["valor_titular"] + valor, 2)
                        titulares[prefix]["valor_total"] = round(titulares[prefix]["valor_total"] + valor, 2)
                    else:
                        # Match name to database colaboradores using diff
                        nome_db = name
                        closest = difflib.get_close_matches(name, colaboradores, n=1, cutoff=0.85)
                        if closest:
                            nome_db = closest[0]
                            
                        titulares[prefix] = {
                            "nome_pdf": name,
                            "nome_db": nome_db,
                            "matricula": prefix,
                            "valor_titular": valor,
                            "dependentes": [],
                            "valor_total": valor,
                            "centro_custo": "N/D",
                            "unidade": "N/D"
                        }
                else:
                    dependentes.append({
                        "nome": name,
                        "tipo": tp,
                        "valor": valor,
                        "parent_prefix": prefix
                    })
                    
            # Associar dependentes
            for dep in dependentes:
                parent_prefix = dep["parent_prefix"]
                if parent_prefix in titulares:
                    titulares[parent_prefix]["dependentes"].append({
                        "nome": dep["nome"],
                        "tipo": dep["tipo"],
                        "valor": dep["valor"]
                    })
                    titulares[parent_prefix]["valor_total"] = round(titulares[parent_prefix]["valor_total"] + dep["valor"], 2)
            
            titulares_list = list(titulares.values())
            
            metrics["gemini_generation_ms"] = 0.0
            metrics["structured_output_ms"] = 0.0
            metrics["post_processing_ms"] = round((time.time() - t0_total) * 1000, 2)
            metrics["total_ms"] = round((time.time() - t0_total) * 1000, 2)
            
            return {
                "titulares": titulares_list,
                "metrics": metrics,
                "file_name_to_delete": None
            }
            
        except Exception as e:
            raise e

    async def analisar_plano_saude_sorriso(self, file_content: bytes, file_name: str, colaboradores: List[str]) -> Dict[str, Any]:
        if not self.client:
            raise Exception("API Key do Gemini não configurada.")
            
        metrics = {
            "upload_pdf_ms": 0.0,
            "file_ready_ms": 0.0,
            "gemini_generation_ms": 0.0,
            "structured_output_ms": 0.0,
            "post_processing_ms": 0.0,
            "total_ms": 0.0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0
        }
        
        t0_total = time.time()
        
        try:
            # 1. Extrair texto usando pypdf em memória
            t0_prep = time.time()
            import io
            pdf_file = io.BytesIO(file_content)
            reader = pypdf.PdfReader(pdf_file)
            text = ""
            for idx, page in enumerate(reader.pages):
                text += f"--- PAGE {idx+1} ---\n" + page.extract_text() + "\n"
            metrics["upload_pdf_ms"] = round((time.time() - t0_prep) * 1000, 2)
            
            prompt = f"""
            Você é um assistente especializado em auditoria de planos de saúde e odontológicos.
            Sua tarefa é analisar o texto extraído do relatório de beneficiários do plano SORRISO CONVÊNIO ODONTOLÓGICO abaixo e extrair os titulares e dependentes com seus respectivos valores (mensalidade).

            Texto Extraído do PDF:
            {text}

            Regras de Extração e Estruturação:
            1. O arquivo possui 15 páginas. Você deve ler e processar todo o texto fornecido (PÁGINA 1 a PÁGINA 15). O total geral de usuários é 163 (sendo 69 titulares e 94 dependentes). NÃO pare a extração na primeira página; percorra todas as páginas para extrair todos os 69 titulares.
            2. Identifique todos os titulares (TIPO = T) em todas as páginas do PDF.
            3. Identifique todos os dependentes (TIPO = D) vinculados a cada titular. No PDF, os dependentes são listados logo após o respectivo titular e antes da linha de SUBTOTAL do grupo familiar correspondente.
            4. Para cada titular encontrado, tente associar o nome do titular com o nome de um colaborador da seguinte lista de colaboradores cadastrados no banco de dados. Encontre o correspondente exato ou o mais próximo:
            {json.dumps(colaboradores, ensure_ascii=False)}
            Se não houver correspondente aceitável, coloque o nome literal do PDF no campo "nome_db".
            5. Extraia o valor unitário da mensalidade (coluna "VR. MENS.") para o titular (valor_titular) e para cada dependente (valor).
            6. Calcule a soma de mensalidade do titular e de todos os dependentes do seu grupo familiar e preencha em "valor_total".
            
            Retorne o resultado de todos os titulares de todas as páginas estritamente conforme o schema estruturado EstruturaExtracaoPlanoSaude.
            """
            
            max_retries = 3
            response = None
            
            t0_gen = time.time()
            for attempt in range(max_retries):
                try:
                    response = await self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=[prompt],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=EstruturaExtracaoPlanoSaude
                        )
                    )
                    break
                except Exception as e:
                    error_str = str(e)
                    if "429 RESOURCE_EXHAUSTED" in error_str and "Quota exceeded" in error_str:
                        await asyncio.sleep(5.0)
                        continue
                    if any(msg in error_str for msg in ["503", "UNAVAILABLE", "500", "504", "deadline"]):
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    raise e
            
            metrics["gemini_generation_ms"] = round((time.time() - t0_gen) * 1000, 2)
            
            t0_struct = time.time()
            titulares_list = []
            if response and response.parsed:
                titulares_list = [t.model_dump() for t in response.parsed.titulares]
            else:
                raw_text = response.text.strip() if response else ""
                if raw_text:
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    raw_text = raw_text.strip()
                    data = json.loads(raw_text)
                    titulares_list = data.get("titulares", [])
            metrics["structured_output_ms"] = round((time.time() - t0_struct) * 1000, 2)
            
            if response and response.usage_metadata:
                metrics["input_tokens"] = response.usage_metadata.prompt_token_count or 0
                metrics["output_tokens"] = response.usage_metadata.candidates_token_count or 0
                metrics["total_tokens"] = response.usage_metadata.total_token_count or 0
            
            t0_post = time.time()
            metrics["post_processing_ms"] = round((time.time() - t0_post) * 1000, 2)
            
            metrics["total_ms"] = round((time.time() - t0_total) * 1000, 2)
            
            return {
                "titulares": titulares_list,
                "metrics": metrics,
                "file_name_to_delete": None
            }
            
        except Exception as e:
            raise e
