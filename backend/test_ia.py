import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.services.ia_service import IAService

async def main():
    service = IAService()
    try:
        # Create a dummy text file content
        dummy_content = b"Nome: Joao. Comprou pastel R$ 10,00 na lanchonete."
        res = await service.analisar_extrato(
            file_content=dummy_content,
            file_name="dummy.txt",
            categorias=["Alimentação", "Transporte"],
            colaboradores=["João", "Maria"],
            empresa_context="Minha Empresa"
        )
        print("Sucesso!")
        print(res)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
