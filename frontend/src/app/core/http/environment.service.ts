import { Injectable } from '@angular/core';

export abstract class IEnvironmentService {
  abstract get apiUrl(): string;
  abstract get defaultTimeout(): number;
  abstract get maxRetries(): number;
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService implements IEnvironmentService {
  // Simulando vindo do environment.ts real
  get apiUrl(): string {
    return 'http://localhost:8000/api/v1'; // Endpoint padrão do FastAPI
  }

  get defaultTimeout(): number {
    return 30000; // 30 segundos
  }

  get maxRetries(): number {
    return 2;
  }
}
