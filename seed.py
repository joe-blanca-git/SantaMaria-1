import requests
from collections import defaultdict

BASE_URL = "http://127.0.0.1:8000/api/v1"

raw_data = """
15051 - MERCHANDISING 	São Paulo
15051 - MERCHANDISING 	Rio de Janeiro
15051 - MERCHANDISING 	Minas gerais
15058 - MERCHANDISING	Mato Grosso
15058 - MERCHANDISING	Mato Grosso do sul
15058 - MERCHANDISING	Goias
15058 - MERCHANDISING	Distrito Federal
14051 - COMERCIAL	São Paulo
14051 - COMERCIAL	Rio de Janeiro
14051 - COMERCIAL	Minas gerais
14051 - COMERCIAL	Espirito Santo
14063 - DESENVOLVIMENTO DE PRODUTOS	São Paulo
14062 - COMERCIAL EXP	Exterior
15012 - ADM MARKETING	São Paulo
11013 - DIRETORIA COMERCIAL	São Paulo
14054 - COMERCIAL 	São Paulo
14050 - COMERCIAL 	São Paulo
14056 - COMERCIAL 	Para
14056 - COMERCIAL 	Amapa
15056 - MERCHANDISING 	Para
15056 - MERCHANDISING 	Amapa
15050 - MERCHANDISING 	São Paulo
15058 - MERCHANDISING 	Mato Grosso
15058 - MERCHANDISING 	Mato Grosso do sul
15058 - MERCHANDISING 	Goias
15058 - MERCHANDISING 	Distrito Federal
14052 - COMERCIAL 	Parana
14052 - COMERCIAL 	Rio Grande do Sul
14052 - COMERCIAL 	Santa Catarina
"""

# Agrupar dados
centros_dict = defaultdict(lambda: {"nome": "", "estados": set()})

for line in raw_data.strip().split("\n"):
    if not line.strip():
        continue
    # A separação entre nome e estado está sendo feita por tabulação ou múltiplos espaços
    # Vamos tratar dividindo pela tabulação primeiro
    parts = line.split("\t")
    if len(parts) < 2:
        parts = line.split("  ") # Fallback para 2 espaços se nao for tab
        parts = [p for p in parts if p.strip()]

    codigo_nome = parts[0].strip()
    estado = parts[-1].strip()

    # Separar 15051 - MERCHANDISING
    codigo_str, *nome_parts = codigo_nome.split(" - ")
    codigo = int(codigo_str.strip())
    nome = " - ".join(nome_parts).strip()

    # Adicionar ao dicionário
    centros_dict[codigo]["nome"] = nome
    # Corrigir estados para ficarem consistentes e nao duplicar
    centros_dict[codigo]["estados"].add(estado.title() if estado.lower() != "exterior" else "Exterior")

# Preparar o payload e fazer o POST
print("Inserindo Centros de Custo formatados...")

for codigo, dados in centros_dict.items():
    payload = {
        "codigo": codigo,
        "nome": dados["nome"],
        "estados": list(dados["estados"])
    }
    
    res = requests.post(f"{BASE_URL}/centros-custo", json=payload)
    if res.status_code in [200, 201]:
        print(f"✅ Sucesso: {codigo} - {dados['nome']} -> {len(dados['estados'])} estados")
    else:
        print(f"❌ Erro ao inserir {codigo}: {res.text}")

print("\nCarga finalizada com sucesso!")
