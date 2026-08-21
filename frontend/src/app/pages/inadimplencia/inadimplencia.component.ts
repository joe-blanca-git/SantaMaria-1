import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

export interface ImportHistory {
  date: string;
  fileName: string;
  type: string;
  rowCount: number;
  status: 'success' | 'failed';
  user: string;
}

@Component({
  selector: 'app-inadimplencia',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardComponent,
    ButtonComponent,
    ModalComponent,
    LoadingComponent,
    BadgeComponent
  ],
  templateUrl: './inadimplencia.component.html',
  styleUrl: './inadimplencia.component.scss'
})
export class InadimplenciaComponent {
  @ViewChild('carteiraFileInput') carteiraFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('historicoFileInput') historicoFileInput!: ElementRef<HTMLInputElement>;

  // Sidebar Menu Selection
  activeMenu = signal<string>('dashboard');

  // Menu Definition
  analisesMenus = signal<MenuItem[]>([
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-columns' },
    { id: 'inadimplencia', label: 'Inadimplência', icon: 'fa-solid fa-chart-line' },
    { id: 'clientes', label: 'Clientes', icon: 'fa-solid fa-users' },
    { id: 'reincidentes', label: 'Reincidentes', icon: 'fa-solid fa-triangle-exclamation' },
    { id: 'representantes', label: 'Representantes', icon: 'fa-regular fa-address-card' },
    { id: 'gerentes', label: 'Gerentes', icon: 'fa-solid fa-briefcase' }
  ]);

  administracaoMenus = signal<MenuItem[]>([
    { id: 'atualizacao', label: 'Atualização de Dados', icon: 'fa-solid fa-upload' }
  ]);

  // Import State Variables
  selectedFile = signal<File | null>(null);
  activeImportType = signal<'carteira' | 'historico' | null>(null);
  isImportModalOpen = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  processingStep = signal<number>(0);
  processingText = signal<string>('');
  importedCount = signal<number>(0);
  divergencesCount = signal<number>(0);

  // Import History List
  importHistory = signal<ImportHistory[]>([
    { date: '19/08/2026 14:32', fileName: 'inadimplentes_agosto_v1.xlsx', type: 'Carteira de Inadimplentes', rowCount: 145, status: 'success', user: 'Ana Paula (Financeiro)' },
    { date: '18/08/2026 10:15', fileName: 'historico_cobranca_2026_08.csv', type: 'Histórico de Cobrança', rowCount: 890, status: 'success', user: 'Ana Paula (Financeiro)' },
    { date: '12/08/2026 16:45', fileName: 'carteira_vencidos_retroativo.xlsx', type: 'Carteira de Inadimplentes', rowCount: 54, status: 'success', user: 'Carlos Silva (Gerente)' }
  ]);

  selectMenu(menuId: string) {
    this.activeMenu.set(menuId);
  }

  triggerImport(type: 'carteira' | 'historico') {
    this.activeImportType.set(type);
    this.selectedFile.set(null);
    this.processingStep.set(0);
    this.isProcessing.set(false);

    if (type === 'carteira' && this.carteiraFileInput) {
      this.carteiraFileInput.nativeElement.value = '';
      this.carteiraFileInput.nativeElement.click();
    } else if (type === 'historico' && this.historicoFileInput) {
      this.historicoFileInput.nativeElement.value = '';
      this.historicoFileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
      this.isImportModalOpen.set(true);
    }
  }

  processFile() {
    if (!this.selectedFile() || !this.activeImportType()) return;

    this.isProcessing.set(true);
    this.processingStep.set(1);
    this.processingText.set('Carregando e validando extensão de colunas do arquivo...');

    setTimeout(() => {
      this.processingStep.set(2);
      this.processingText.set('Tratando inconsistências cadastrais e checando duplicidades...');
      
      setTimeout(() => {
        this.processingStep.set(3);
        this.processingText.set('Compondo conciliação de recebíveis pendentes com a base interna...');
        
        setTimeout(() => {
          const rows = Math.floor(Math.random() * 200) + 30;
          const divs = Math.floor(Math.random() * 8);

          this.importedCount.set(rows);
          this.divergencesCount.set(divs);
          this.processingStep.set(4);
          this.isProcessing.set(false);

          // Add to History
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
          
          const newImport: ImportHistory = {
            date: dateStr,
            fileName: this.selectedFile()?.name || 'arquivo_importado.xlsx',
            type: this.activeImportType() === 'carteira' ? 'Carteira de Inadimplentes' : 'Histórico de Cobrança',
            rowCount: rows,
            status: 'success',
            user: 'Ana Paula (Financeiro)' // Mock current logged user
          };

          this.importHistory.update(list => [newImport, ...list]);
        }, 1500);
      }, 1500);
    }, 1500);
  }

  closeModal() {
    this.isImportModalOpen.set(false);
    this.selectedFile.set(null);
    this.activeImportType.set(null);
    this.processingStep.set(0);
  }
}
