import requests
import json

url = "http://127.0.0.1:8000/api/v1/colaboradores/upload"
filepath = r"C:\Users\tania.canedo\Desktop\RELAÇÃO FUNCIONÁRIOS .xlsx"

print(f"Enviando planilha {filepath} para {url}...")
try:
    with open(filepath, "rb") as f:
        files = {"file": ("RELAÇÃO FUNCIONÁRIOS .xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        response = requests.post(url, files=files, stream=True)
        
    print(f"Status Code: {response.status_code}")
    for line in response.iter_lines():
        if line:
            print(line.decode('utf-8'))
except Exception as e:
    print(f"Erro: {e}")
