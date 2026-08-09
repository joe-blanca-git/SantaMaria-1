import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from './colaboradores.service';

export interface TipoColaborador {
  idTipoColaborador?: number;
  nome: string;
  descricao?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TiposColaboradoresService {
  private apiUrl = `${environment.apiUrl}/tipos-colaboradores`;

  constructor(private http: HttpClient) {}

  listar(page = 1, pageSize = 100): Observable<PaginatedResponse<TipoColaborador>> {
    return this.http.get<PaginatedResponse<TipoColaborador>>(`${this.apiUrl}?page=${page}&page_size=${pageSize}`);
  }

  criar(tipo: TipoColaborador): Observable<TipoColaborador> {
    return this.http.post<TipoColaborador>(this.apiUrl, tipo);
  }

  atualizar(id: number, tipo: TipoColaborador): Observable<TipoColaborador> {
    return this.http.put<TipoColaborador>(`${this.apiUrl}/${id}`, tipo);
  }

  excluir(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
