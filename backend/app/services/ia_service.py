import os
import json
import tempfile
import time
import asyncio
import re
from google import genai
from google.genai import types
from typing import List, Dict, Any
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

class IAService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key and api_key != "sua_chave_aqui":
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = None
            print("AVISO: GEMINI_API_KEY não configurada corretamente no .env")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

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
        
        # Otimização: Uso inline se o arquivo for menor que 15MB, evitando Files API e polling
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
                # Polling rápido com intervalo progressivo para diminuir latência
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
            Você é um assistente especializado em finanças corporativas.
            Sua tarefa é analisar este arquivo (que pode ser um extrato ou fatura), identificar as despesas, os valores, os colaboradores envolvidos e classificar cada despesa.

            A empresa/cartão de origem é: {empresa_context}

            Para a classificação, você DEVE tentar encaixar a despesa em uma destas categorias conhecidas:
            {json.dumps(categorias, ensure_ascii=False)}
            
            Se a despesa definitivamente não se encaixar em nenhuma delas, use a categoria "Outros". Use o bom senso.
            
            Para o colaborador, identifique o nome da pessoa associada à despesa no extrato. O sistema possui os seguintes colaboradores cadastrados, tente achar o correspondente exato ou o mais próximo se houver abreviação:
            {json.dumps(colaboradores, ensure_ascii=False)}
            
            Se o nome não estiver na lista ou não houver colaborador listado, use o nome literal que encontrar ou "Não Identificado".
            """
            
            contents.append(prompt)
            
            max_retries = 3
            last_error = None
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
                            # Controle de thinking_level para baixa latência em extração
                            thinking_config=types.ThinkingConfig(thinking_level="low")
                        )
                    )
                    break
                except Exception as e:
                    error_str = str(e)
                    # Quota Exceeded (429)
                    if "429 RESOURCE_EXHAUSTED" in error_str and "Quota exceeded" in error_str:
                        match = re.search(r"Please retry in ([\d\.]+)s", error_str)
                        if match:
                            secs = float(match.group(1)) + 0.5
                            print(f"[IA] Quota excedida. Aguardando {secs}s...")
                            await asyncio.sleep(secs)
                            continue
                        
                        print("[IA] Quota excedida. Aguardando 5s...")
                        await asyncio.sleep(5.0)
                        continue
                    
                    # Erro de rede/servidor transitório (503, UNAVAILABLE, etc.)
                    if any(msg in error_str for msg in ["503", "UNAVAILABLE", "500", "504", "deadline"]):
                        last_error = e
                        if attempt < max_retries - 1:
                            wait_time = 2 * (attempt + 1)
                            print(f"[IA] Erro transitório ({attempt + 1}). Aguardando {wait_time}s... Erro: {e}")
                            await asyncio.sleep(wait_time)
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

    async def deletar_arquivo(self, file_name: str):
        if not self.client or not file_name:
            return
        try:
            await self.client.aio.files.delete(name=file_name)
            print(f"[IA] Arquivo {file_name} deletado com sucesso do Gemini em background.")
        except Exception as e:
            print(f"[IA] Erro ao deletar arquivo {file_name} do Gemini: {e}")
