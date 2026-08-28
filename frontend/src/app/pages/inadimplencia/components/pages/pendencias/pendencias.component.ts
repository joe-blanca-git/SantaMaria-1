import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt.js';

export interface KanbanCard {
  id: string;
  title: string;
  status: string;
  statusColor: string;
  clientName: string;
  leadTimeDays: number;
  dataAbertura: Date;
}

export interface KanbanColumn {
  id: string;
  title: string;
  icon: string;
  colorClass: string;
  cards: KanbanCard[];
}

type PeriodShortcut = 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado' | 'personalizado';

const COLUMN_VISIBILITY_STORAGE_KEY = 'pendencias_colunas_visiveis';

function getDataAbertura(leadTimeDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - leadTimeDays);
  return d;
}

function loadVisibleColumnIds(allIds: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (raw !== null) {
      const saved: string[] = JSON.parse(raw);
      return new Set(saved.filter(id => allIds.includes(id)));
    }
  } catch {
    // localStorage indisponível ou dado corrompido: usa o padrão (todas visíveis)
  }
  return new Set(allIds);
}

function saveVisibleColumnIds(ids: Set<string>) {
  try {
    localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignora falha ao persistir a preferência
  }
}

@Component({
  selector: 'app-pendencias',
  standalone: true,
  imports: [CommonModule, FormsModule, FlatpickrModule],
  templateUrl: './pendencias.component.html',
  styleUrl: './pendencias.component.scss'
})
export class PendenciasComponent {
  locale = Portuguese;

  dataInicio: Date | null = null;
  dataFim: Date | null = null;
  activePeriodShortcut: PeriodShortcut | null = null;
  statusFiltro: string | null = null;

  columns: KanbanColumn[] = [
    { 
      id: 'pendencias', 
      title: 'Pendências', 
      icon: 'fa-solid fa-triangle-exclamation',
      colorClass: 'danger',
      cards: [
        {
          id: 'c1',
          title: 'NF 1234567',
          status: 'Em Atraso',
          statusColor: 'danger',
          clientName: 'Indústrias Wayne S.A.',
          leadTimeDays: 15,
          dataAbertura: getDataAbertura(15)
        },
        {
          id: 'c2',
          title: 'Fatura 9876543',
          status: 'Urgente',
          statusColor: 'danger',
          clientName: 'Stark Industries',
          leadTimeDays: 8,
          dataAbertura: getDataAbertura(8)
        }
      ]
    },
    { 
      id: 'logistica', 
      title: 'Logística', 
      icon: 'fa-solid fa-truck',
      colorClass: 'warning',
      cards: [
        {
          id: 'c3',
          title: 'CTe 5678901',
          status: 'Análise',
          statusColor: 'warning',
          clientName: 'Oscorp Corporation',
          leadTimeDays: 4,
          dataAbertura: getDataAbertura(4)
        }
      ]
    },
    { 
      id: 'fiscal', 
      title: 'Fiscal', 
      icon: 'fa-regular fa-file-lines',
      colorClass: 'info',
      cards: [
        {
          id: 'c4',
          title: 'NF 8877665',
          status: 'Revisão',
          statusColor: 'info',
          clientName: 'LexCorp Solutions',
          leadTimeDays: 12,
          dataAbertura: getDataAbertura(12)
        }
      ]
    },
    { 
      id: 'comercial', 
      title: 'Comercial', 
      icon: 'fa-solid fa-cart-shopping',
      colorClass: 'primary',
      cards: [
        {
          id: 'c5',
          title: 'Acordo 1122334',
          status: 'Aprovação',
          statusColor: 'primary',
          clientName: 'ACME Corp',
          leadTimeDays: 2,
          dataAbertura: getDataAbertura(2)
        }
      ]
    },
    { 
      id: 'financeiro', 
      title: 'Financeiro', 
      icon: 'fa-solid fa-dollar-sign',
      colorClass: 'secondary',
      cards: [
        {
          id: 'c6',
          title: 'Remessa 3344556',
          status: 'Processando',
          statusColor: 'secondary',
          clientName: 'Umbrella Corporation',
          leadTimeDays: 1,
          dataAbertura: getDataAbertura(1)
        }
      ]
    },
    { 
      id: 'finalizado', 
      title: 'Finalizado', 
      icon: 'fa-solid fa-circle-check',
      colorClass: 'success',
      cards: [
        {
          id: 'c7',
          title: 'NF 1120998',
          status: 'Pago',
          statusColor: 'success',
          clientName: 'Cyberdyne Systems',
          leadTimeDays: 0,
          dataAbertura: getDataAbertura(0)
        }
      ]
    },
  ];

  visibleColumnIds: Set<string> = loadVisibleColumnIds(this.columns.map(c => c.id));
  isColumnFilterOpen = false;

  @ViewChild('columnFilterWrapper') columnFilterWrapper?: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isColumnFilterOpen) return;
    const wrapperEl = this.columnFilterWrapper?.nativeElement;
    if (wrapperEl && !wrapperEl.contains(event.target as Node)) {
      this.isColumnFilterOpen = false;
    }
  }

  get statusOptions(): string[] {
    const statuses = this.columns.flatMap(col => col.cards.map(card => card.status));
    return Array.from(new Set(statuses));
  }

  get visibleColumnsLabel(): string {
    const total = this.columns.length;
    const visible = this.visibleColumnIds.size;
    if (visible === total) return 'Todas as colunas';
    if (visible === 0) return 'Nenhuma coluna';
    return `${visible} de ${total} colunas`;
  }

  toggleColumnFilterOpen() {
    this.isColumnFilterOpen = !this.isColumnFilterOpen;
  }

  isColumnVisible(columnId: string): boolean {
    return this.visibleColumnIds.has(columnId);
  }

  toggleColumnVisibility(columnId: string) {
    if (this.visibleColumnIds.has(columnId)) {
      this.visibleColumnIds.delete(columnId);
    } else {
      this.visibleColumnIds.add(columnId);
    }
    saveVisibleColumnIds(this.visibleColumnIds);
  }

  get filteredColumns(): KanbanColumn[] {
    return this.columns
      .filter(column => this.visibleColumnIds.has(column.id))
      .map(column => ({
        ...column,
        cards: column.cards.filter(card => this.cardMatchesFilters(card))
      }));
  }

  private cardMatchesFilters(card: KanbanCard): boolean {
    if (this.statusFiltro && card.status !== this.statusFiltro) {
      return false;
    }
    if (this.dataInicio && card.dataAbertura < this.dataInicio) {
      return false;
    }
    if (this.dataFim && card.dataAbertura > this.dataFim) {
      return false;
    }
    return true;
  }

  onDataInicioChange() {
    if (this.dataInicio && this.dataFim && this.dataInicio > this.dataFim) {
      this.dataFim = this.dataInicio;
    }
    this.activePeriodShortcut = 'personalizado';
  }

  onDataFimChange() {
    this.activePeriodShortcut = 'personalizado';
  }

  onShortcutSelectChange(val: PeriodShortcut) {
    if (val && val !== 'personalizado') {
      this.selecionarAtalhoPeriodo(val);
    }
  }

  selecionarAtalhoPeriodo(shortcut: Exclude<PeriodShortcut, 'personalizado'>) {
    const today = new Date();

    const getPastDate = (monthsAgo: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - monthsAgo);
      return d;
    };

    if (shortcut === 'ultimo-bimestre') {
      this.dataInicio = getPastDate(2);
      this.dataFim = today;
    } else if (shortcut === 'ultimo-semestre') {
      this.dataInicio = getPastDate(6);
      this.dataFim = today;
    } else if (shortcut === 'este-ano') {
      this.dataInicio = new Date(today.getFullYear(), 0, 1);
      this.dataFim = new Date(today.getFullYear(), 11, 31);
    } else if (shortcut === 'ano-passado') {
      this.dataInicio = new Date(today.getFullYear() - 1, 0, 1);
      this.dataFim = new Date(today.getFullYear() - 1, 11, 31);
    }

    this.activePeriodShortcut = shortcut;
  }

  draggedCard: KanbanCard | null = null;
  sourceColumnId: string | null = null;
  dragOverColumnId: string | null = null;

  onDragStart(event: DragEvent, card: KanbanCard, column: KanbanColumn) {
    this.draggedCard = card;
    this.sourceColumnId = column.id;
    
    // Pequeno atraso para permitir que o navegador gere a imagem ghost antes de reduzirmos a opacidade
    setTimeout(() => {
      if (event.target instanceof HTMLElement) {
        event.target.classList.add('dragging');
      }
    }, 0);
  }

  onDragEnd(event: DragEvent) {
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove('dragging');
    }
    this.draggedCard = null;
    this.sourceColumnId = null;
    this.dragOverColumnId = null;
  }

  onDragOver(event: DragEvent) {
    // Essencial para permitir que o drop aconteça nesta zona
    event.preventDefault();
  }
  
  onDragEnter(event: DragEvent, column: KanbanColumn) {
    event.preventDefault();
    if (this.draggedCard && this.sourceColumnId !== column.id) {
      this.dragOverColumnId = column.id;
    }
  }

  onDragLeave(event: DragEvent, column: KanbanColumn) {
    // Evita piscar quando o mouse se move por cima dos cards internos da coluna
    if (this.dragOverColumnId === column.id) {
      this.dragOverColumnId = null;
    }
  }

  onDrop(event: DragEvent, targetColumn: KanbanColumn) {
    event.preventDefault();
    this.dragOverColumnId = null;
    
    if (this.draggedCard && this.sourceColumnId && this.sourceColumnId !== targetColumn.id) {
      // Remove da coluna de origem
      const sourceCol = this.columns.find(c => c.id === this.sourceColumnId);
      if (sourceCol) {
        sourceCol.cards = sourceCol.cards.filter(c => c.id !== this.draggedCard!.id);
      }

      // Adiciona na coluna de destino (busca a coluna real, já que o template itera sobre a versão filtrada)
      const destCol = this.columns.find(c => c.id === targetColumn.id);
      if (destCol) {
        destCol.cards.push(this.draggedCard);
      }
    }
  }
}
