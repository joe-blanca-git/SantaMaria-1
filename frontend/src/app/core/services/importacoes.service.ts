import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Importacao {
  idImportacoes: number;
  nomeArquivo: string;
  extensaoArquivo: string;
  idEmpresa?: number;
  tipo: string;
  createdAt: string;
  updatedAte?: string;
  empresa?: {
    idEmpresas: number;
    nome: string;
    descricao?: string;
  };
  valor_total?: number;
}

export interface ImportacaoPaginatedResponse {
  items: Importacao[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface DespesaExtraida {
  empresa: string;
  colaborador: string;
  categoria: string;
  valor: number;
}

export interface AnaliseExtratoResponse {
  sucesso: boolean;
  dados: DespesaExtraida[];
}

@Injectable({
  providedIn: 'root'
})
export class ImportacoesService {
  private apiUrl = `${environment.apiUrl}/importacoes`;

  constructor(private http: HttpClient) {}

  listar(page: number = 1, size: number = 10, search?: string): Observable<ImportacaoPaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
      
    if (search) {
      params = params.set('search', search);
    }
    
    return this.http.get<ImportacaoPaginatedResponse>(this.apiUrl, { params });
  }

  analisarExtrato(file: File, empresaNome: string): Observable<AnaliseExtratoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('empresa_nome', empresaNome);
    
    return this.http.post<AnaliseExtratoResponse>(`${this.apiUrl}/ia/analise-extrato`, formData);
  }

  salvarExtraidos(nomeArquivo: string, despesas: DespesaExtraida[]): Observable<any> {
    const payload = {
      nomeArquivo,
      despesas
    };
    return this.http.post(`${this.apiUrl}/ia/salvar`, payload);
  }

  excluir(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  obterDadosDashboard(filtros: any): Observable<any> {
    let params = new HttpParams();
    if (filtros.data_inicio) params = params.set('data_inicio', filtros.data_inicio);
    if (filtros.data_fim) params = params.set('data_fim', filtros.data_fim);
    if (filtros.id_empresa) params = params.set('id_empresa', filtros.id_empresa.toString());
    if (filtros.id_colaborador) params = params.set('id_colaborador', filtros.id_colaborador.toString());
    if (filtros.id_categoria) params = params.set('id_categoria', filtros.id_categoria.toString());
    
    return this.http.get<any>(`${this.apiUrl}/dashboard`, { params });
  }

  obterDadosDashboardAnalitico(filtros: any): Observable<any> {
    let params = new HttpParams();
    if (filtros.data_inicio) params = params.set('data_inicio', filtros.data_inicio);
    if (filtros.data_fim) params = params.set('data_fim', filtros.data_fim);
    if (filtros.id_empresa) params = params.set('id_empresa', filtros.id_empresa.toString());
    if (filtros.id_colaborador) params = params.set('id_colaborador', filtros.id_colaborador.toString());
    if (filtros.id_categoria) params = params.set('id_categoria', filtros.id_categoria.toString());
    
    return this.http.get<any>(`${this.apiUrl}/dashboard/analitico`, { params });
  }

  extrairAtacadao(file: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/atacadao/extrair`, formData, {
      responseType: 'blob'
    });
  }

  extrairSendas(file: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/sendas/extrair`, formData, {
      responseType: 'blob'
    });
  }

  conciliarProrrogacaoAtacadao(htmlFile: File, csvFile: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('html_file', htmlFile);
    formData.append('csv_file', csvFile);
    return this.http.post(`${this.apiUrl}/atacadao/conciliar`, formData, {
      responseType: 'blob'
    });
  }

  conciliarProrrogacaoSendas(sendasFile: File, acrFile: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('sendas_file', sendasFile);
    formData.append('acr_file', acrFile);
    return this.http.post(`${this.apiUrl}/sendas/conciliar`, formData, {
      responseType: 'blob'
    });
  }

  conciliarProrrogacaoMartminas(martminasFile: File, acrFile: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('martminas_file', martminasFile);
    formData.append('acr_file', acrFile);
    return this.http.post(`${this.apiUrl}/martminas/conciliar`, formData, {
      responseType: 'blob'
    });
  }

  conciliarProrrogacaoSavegnago(savegnagoFile: File, acrFile: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('savegnago_file', savegnagoFile);
    formData.append('acr_file', acrFile);
    return this.http.post(`${this.apiUrl}/savegnago/conciliar`, formData, {
      responseType: 'blob'
    });
  }

  conciliarPagamentos(apbFile: File, bancoFiles: File[]): Observable<any> {
    const formData = new FormData();
    formData.append('apb_file', apbFile);
    bancoFiles.forEach((file) => {
      formData.append('banco_files', file);
    });
    return this.http.post<any>(`${this.apiUrl}/conciliacao-pagamentos/cruzamento`, formData);
  }

  exportarConciliacao(dados: any[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/conciliacao-pagamentos/exportar`, dados, {
      responseType: 'blob'
    });
  }

  analisarSorriso(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/plano-saude/sorriso/analisar`, formData);
  }

  confirmarSorriso(nomeArquivo: string, titulares: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/plano-saude/sorriso/confirmar`, {
      nomeArquivo,
      titulares
    });
  }

  exportarSorrisoExcel(titulares: any[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/plano-saude/sorriso/exportar`, { titulares }, {
      responseType: 'blob'
    });
  }

  analisarUnimedOdonto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/plano-saude/unimed-odonto/analisar`, formData);
  }

  confirmarUnimedOdonto(nomeArquivo: string, titulares: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/plano-saude/unimed-odonto/confirmar`, {
      nomeArquivo,
      titulares
    });
  }

  exportarUnimedOdontoExcel(titulares: any[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/plano-saude/unimed-odonto/exportar`, { titulares }, {
      responseType: 'blob'
    });
  }
}
