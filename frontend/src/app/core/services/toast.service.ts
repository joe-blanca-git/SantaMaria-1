import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toasts = signal<ToastMessage[]>([]);
  toasts = this._toasts.asReadonly();
  private nextId = 0;

  show(text: string, type: ToastMessage['type'] = 'info', durationMs = 4000): void {
    const id = this.nextId++;
    this._toasts.update(list => [...list, { id, text, type }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
