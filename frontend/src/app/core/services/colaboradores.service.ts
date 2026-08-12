import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipoColaborador } from './tipos-colaboradores.service';
import { CentroCusto } from './centros-custo.service';
import { Unidade } from './unidades.service';

export interface Colaborador {
  idColaborador?: number;
  nome: string;
  idCentroCusto: number;
  idTipoColaborador: number;
  idUnidade?: number;
  tipo_colaborador?: TipoColaborador;
  centro_custo?: CentroCusto;
  unidade?: Unidade;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ColaboradoresService {
  private apiUrl = `${environment.apiUrl}/colaboradores`;

  constructor(private http: HttpClient) {}

  getApiUrl(): string {
    return this.apiUrl;
  }

  listar(page = 1, pageSize = 10): Observable<PaginatedResponse<Colaborador>> {
    return this.http.get<PaginatedResponse<Colaborador>>(`${this.apiUrl}?page=${page}&page_size=${pageSize}`);
  }

  buscarPorId(id: number): Observable<Colaborador> {
    return this.http.get<Colaborador>(`${this.apiUrl}/${id}`);
  }

  criar(colaborador: Colaborador): Observable<Colaborador> {
    return this.http.post<Colaborador>(this.apiUrl, colaborador);
  }

  atualizar(id: number, colaborador: Partial<Colaborador>): Observable<Colaborador> {
    return this.http.put<Colaborador>(`${this.apiUrl}/${id}`, colaborador);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
