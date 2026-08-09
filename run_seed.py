import urllib.request
import json

BASE_URL = 'http://127.0.0.1:8000/api/v1/centros-custo/'
centros = [
    {'codigo':15051,'nome':'MERCHANDISING','estados':['São Paulo','Rio de Janeiro','Minas Gerais']},
    {'codigo':14051,'nome':'COMERCIAL','estados':['São Paulo','Rio de Janeiro','Minas Gerais','Espírito Santo']},
    {'codigo':14063,'nome':'DESENVOLVIMENTO DE PRODUTOS','estados':['São Paulo']},
    {'codigo':15012,'nome':'ADM MARKETING','estados':['São Paulo']},
    {'codigo':11013,'nome':'DIRETORIA COMERCIAL','estados':['São Paulo']},
    {'codigo':14054,'nome':'COMERCIAL','estados':['São Paulo']},
    {'codigo':14050,'nome':'COMERCIAL','estados':['São Paulo']},
    {'codigo':15050,'nome':'MERCHANDISING','estados':['São Paulo']}
]

for c in centros:
    data = json.dumps(c).encode('utf-8')
    req = urllib.request.Request(BASE_URL, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        urllib.request.urlopen(req)
        print(f'Sucesso: {c["codigo"]}')
    except Exception as e:
        print(f'Erro em {c["codigo"]}: {e}')
