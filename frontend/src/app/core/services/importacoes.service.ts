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
}

export interface ImportacaoPaginatedResponse {
  items: Importacao[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
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
}
