import { Component, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ImportacoesService } from '../../core/services/importacoes.service';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

export interface ConciliacaoHistory {
  date: string;
  fileName: string;
  matchedCount: number;
  unmatchedCount: number;
  divergencesCount: number;
  status: 'success' | 'warning' | 'failed';
  user: string;
}

export interface ConferenciaItem {
  banco_data: string;
  banco_descricao: string;
  banco_documento: string;
  banco_valor: number;
  apb_data: string;
  apb_documento: string;
  apb_fornecedor: string;
  apb_valor: number;
  status: 'conciliado' | 'divergente' | 'nao_encontrado';
  cnpj_cpf?: string;
  dados_bancarios?: string;
  situacao?: string;
}

@Component({
  selector: 'app-conciliacao-pagamentos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardComponent,
    ButtonComponent,
    ModalComponent,
    LoadingComponent,
    BadgeComponent
  ],
  templateUrl: './conciliacao-pagamentos.component.html',
  styleUrl: './conciliacao-pagamentos.component.scss'
})
export class ConciliacaoPagamentosComponent {
  private importacoesService = inject(ImportacoesService);

  @ViewChild('apbFileInput') apbFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bancoFileInput') bancoFileInput!: ElementRef<HTMLInputElement>;

  // Sidebar Menu Selection
  activeMenu = signal<string>('dashboard');

  // Menu Definition
  analisesMenus = signal<MenuItem[]>([
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-columns' },
    { id: 'extratos', label: 'Extratos Bancários', icon: 'fa-solid fa-money-check-dollar' },
    { id: 'relatorios', label: 'Relatórios de Fechamento', icon: 'fa-solid fa-chart-line' }
  ]);

  administracaoMenus = signal<MenuItem[]>([
    { id: 'conciliar', label: 'Executar Conciliação', icon: 'fa-solid fa-scale-balanced' }
  ]);

  // Import State Variables
  selectedFileApb = signal<File | null>(null);
  selectedFilesBanco = signal<File[]>([]);
  
  // Progress/Process State
  isProcessing = signal<boolean>(false);
  processingStep = signal<number>(0);
  processingText = signal<string>('');
  
  // Conferencia State
  isConferenciaModalOpen = signal<boolean>(false);
  conferenciaItems = signal<ConferenciaItem[]>([]);
  isExporting = signal<boolean>(false);

  // History List
  conciliacaoHistory = signal<ConciliacaoHistory[]>([
    { date: '20/08/2026 09:15', fileName: 'extrato_itau_20260819.ofx', matchedCount: 142, unmatchedCount: 4, divergencesCount: 1, status: 'warning', user: 'Ana Paula (Financeiro)' },
    { date: '19/08/2026 15:40', fileName: 'extrato_bradesco_20260818.ofx', matchedCount: 98, unmatchedCount: 0, divergencesCount: 0, status: 'success', user: 'Ana Paula (Financeiro)' },
    { date: '18/08/2026 11:22', fileName: 'extrato_bb_20260817.ofx', matchedCount: 215, unmatchedCount: 0, divergencesCount: 0, status: 'success', user: 'Carlos Silva (Gerente)' }
  ]);

  selectMenu(menuId: string) {
    this.activeMenu.set(menuId);
  }

  triggerUpload(type: 'apb' | 'banco') {
    if (type === 'apb' && this.apbFileInput) {
      this.apbFileInput.nativeElement.value = '';
      this.apbFileInput.nativeElement.click();
    } else if (type === 'banco' && this.bancoFileInput) {
      this.bancoFileInput.nativeElement.value = '';
      this.bancoFileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event, type: 'apb' | 'banco') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (type === 'apb') {
        this.selectedFileApb.set(input.files[0]);
      } else {
        const filesArray = Array.from(input.files);
        this.selectedFilesBanco.update(existing => [...existing, ...filesArray]);
      }
    }
  }

  removeBancoFile(index: number) {
    this.selectedFilesBanco.update(files => files.filter((_, i) => i !== index));
  }

  processarCruzamento() {
    const apb = this.selectedFileApb();
    const bancos = this.selectedFilesBanco();

    if (!apb || bancos.length === 0) return;

    this.isProcessing.set(true);
    this.processingStep.set(1);
    this.processingText.set('Enviando arquivos para análise e extração...');

    // Progress updates to simulate stages
    setTimeout(() => {
      this.processingStep.set(2);
      this.processingText.set('Extraindo transações dos arquivos do banco (usando IA para PDFs)...');
      
      setTimeout(() => {
        this.processingStep.set(3);
        this.processingText.set('Executando cruzamento inteligente de lançamentos...');
        
        // Execute API call
        this.importacoesService.conciliarPagamentos(apb, bancos).subscribe({
          next: (res) => {
            this.isProcessing.set(false);
            if (res.sucesso && res.conferencia) {
              this.conferenciaItems.set(res.conferencia);
              this.isConferenciaModalOpen.set(true);
            }
          },
          error: (err) => {
            this.isProcessing.set(false);
            console.error('Erro ao realizar conciliação:', err);
            alert('Ocorreu um erro no processamento da conciliação. Verifique a chave de API e a integridade dos arquivos.');
          }
        });
      }, 1500);
    }, 1500);
  }

  updateConferenciaItem(index: number, field: keyof ConferenciaItem, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = field === 'apb_valor' || field === 'banco_valor' ? parseFloat(input.value) || 0 : input.value;
    
    this.conferenciaItems.update(items => {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        [field]: value
      } as ConferenciaItem;
      
      // Auto-recalculate status if values are edited
      if (field === 'apb_valor' || field === 'banco_valor') {
        const apbVal = updated[index].apb_valor;
        const bVal = updated[index].banco_valor;
        if (apbVal > 0 && bVal > 0) {
          updated[index].status = Math.abs(apbVal - bVal) < 0.01 ? 'conciliado' : 'divergente';
        } else {
          updated[index].status = 'nao_encontrado';
        }
      }
      
      return updated;
    });
  }

  changeStatus(index: number, newStatus: 'conciliado' | 'divergente' | 'nao_encontrado') {
    this.conferenciaItems.update(items => {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        status: newStatus
      };
      return updated;
    });
  }

  confirmarEExportar() {
    this.isExporting.set(true);
    const dados = this.conferenciaItems();

    this.importacoesService.exportarConciliacao(dados).subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.isConferenciaModalOpen.set(false);

        // Download Excel File
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conciliacao_consolidada.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Compute metrics for history
        const matched = dados.filter(d => d.status === 'conciliado').length;
        const divergences = dados.filter(d => d.status === 'divergente').length;
        const unmatched = dados.filter(d => d.status === 'nao_encontrado').length;

        // Add item to history
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        
        const newHistory: ConciliacaoHistory = {
          date: dateStr,
          fileName: this.selectedFileApb()?.name || 'conciliacao.xlsx',
          matchedCount: matched,
          unmatchedCount: unmatched,
          divergencesCount: divergences,
          status: divergences > 0 ? 'warning' : 'success',
          user: 'Ana Paula (Financeiro)'
        };

        this.conciliacaoHistory.update(list => [newHistory, ...list]);

        // Reset file selections
        this.selectedFileApb.set(null);
        this.selectedFilesBanco.set([]);
      },
      error: (err) => {
        this.isExporting.set(false);
        console.error('Erro ao exportar planilha:', err);
        alert('Não foi possível exportar a planilha de conciliação.');
      }
    });
  }

  cancelarConferencia() {
    this.isConferenciaModalOpen.set(false);
    this.conferenciaItems.set([]);
  }
}
