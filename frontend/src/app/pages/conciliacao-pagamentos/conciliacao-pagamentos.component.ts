import { Component, signal, ViewChild, ElementRef, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { ImportacoesService } from '../../core/services/importacoes.service';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

export interface ConciliacaoHistory {
  id?: number;
  date: string;
  fileName: string;
  matchedCount: number;
  unmatchedCount: number;
  divergencesCount: number;
  status: 'success' | 'warning' | 'failed' | string;
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
    BadgeComponent,
    ConfirmModalComponent
  ],
  templateUrl: './conciliacao-pagamentos.component.html',
  styleUrl: './conciliacao-pagamentos.component.scss'
})
export class ConciliacaoPagamentosComponent implements OnInit {
  private importacoesService = inject(ImportacoesService);

  // Confirm/Alert Modal State
  isConfirmModalOpen = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmText = 'Confirmar';
  cancelText = 'Cancelar';
  confirmVariant: 'danger' | 'primary' = 'primary';
  showCancelConfirm = true;
  confirmCallback: () => void = () => {};

  openConfirmModal(title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'danger') {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmText = 'Confirmar';
    this.cancelText = 'Cancelar';
    this.confirmVariant = variant;
    this.showCancelConfirm = true;
    this.confirmCallback = onConfirm;
    this.isConfirmModalOpen = true;
  }

  openAlert(title: string, message: string, variant: 'danger' | 'primary' = 'primary') {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmText = 'Ok';
    this.cancelText = '';
    this.confirmVariant = variant;
    this.showCancelConfirm = false;
    this.confirmCallback = () => this.closeConfirmModal();
    this.isConfirmModalOpen = true;
  }

  closeConfirmModal() {
    this.isConfirmModalOpen = false;
  }

  executeConfirm() {
    this.confirmCallback();
  }

  extractErrorMessage(err: any): string {
    if (err && err.error) {
      if (typeof err.error.detail === 'string') {
        return err.error.detail;
      }
      if (Array.isArray(err.error.detail)) {
        return err.error.detail.map((d: any) => `${d.loc?.join('.') || ''}: ${d.msg}`).join('\n');
      }
      if (err.error.message) {
        return err.error.message;
      }
    }
    return err.message || 'Erro desconhecido no servidor';
  }

  @ViewChild('apbFileInput') apbFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bancoFileInput') bancoFileInput!: ElementRef<HTMLInputElement>;

  // Sidebar Menu Selection
  activeMenu = signal<string>('dashboard');

  isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') !== null
    ? localStorage.getItem('sidebarCollapsed') === 'true'
    : false;

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.isSidebarCollapsed));
  }

  // Menu Definition
  menus = signal<MenuItem[]>([
    { id: 'dashboard', label: 'Dashboards', icon: 'fa-solid fa-table-columns' },
    { id: 'conciliar', label: 'Conciliações', icon: 'fa-solid fa-scale-balanced' }
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

  // History Search
  searchConciliacao = signal<string>('');

  // History List
  conciliacaoHistory = signal<ConciliacaoHistory[]>([]);

  filteredConciliacaoHistory = computed(() => {
    const term = this.searchConciliacao().toLowerCase().trim();
    if (!term) return this.conciliacaoHistory();
    return this.conciliacaoHistory().filter(h => 
      h.fileName.toLowerCase().includes(term) ||
      h.user.toLowerCase().includes(term) ||
      h.date.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    this.carregarHistorico();
  }

  carregarHistorico() {
    this.importacoesService.listar(1, 50, undefined, 'CONCILIACAO_BANCARIA').subscribe({
      next: (res) => {
        const mapped = (res.items || []).map((imp: any) => this.mapImportacaoToHistory(imp));
        this.conciliacaoHistory.set(mapped);
      },
      error: (err) => console.error('Erro ao carregar historico de conciliações:', err)
    });
  }

  mapImportacaoToHistory(imp: any): ConciliacaoHistory {
    const parts = (imp.tipo || '').split('|');
    const matchedCount = parts[1] ? parseInt(parts[1], 10) : 0;
    const unmatchedCount = parts[2] ? parseInt(parts[2], 10) : 0;
    const divergencesCount = parts[3] ? parseInt(parts[3], 10) : 0;
    const status = parts[4] || 'success';
    const user = parts[5] || 'Sistema';
    
    let dateStr = imp.createdAt;
    try {
      const d = new Date(imp.createdAt);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    } catch (e) {
      console.error(e);
    }

    return {
      id: imp.idImportacoes,
      date: dateStr,
      fileName: imp.nomeArquivo,
      matchedCount,
      unmatchedCount,
      divergencesCount,
      status,
      user
    };
  }

  excluirConciliacao(id: number) {
    this.openConfirmModal(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta conciliação? Esta ação é irreversível.',
      () => {
        this.closeConfirmModal();
        this.importacoesService.excluir(id).subscribe({
          next: () => {
            this.carregarHistorico();
          },
          error: (err) => {
            console.error('Erro ao excluir conciliação', err);
            this.openAlert('Erro', 'Não foi possível excluir o registro.', 'danger');
          }
        });
      },
      'danger'
    );
  }

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
        const file = input.files[0];
        this.selectedFileApb.set(file);
        this.lerPlanilhaApb(file);
      } else {
        const filesArray = Array.from(input.files);
        this.selectedFilesBanco.update(existing => [...existing, ...filesArray]);
      }
    }
  }

  lerPlanilhaApb(file: File) {
    this.importacoesService.lerApb(file).subscribe({
      next: (res) => {
        console.log('=== LISTA DE PESSOAS CONSOLIDADAS (PLANILHA APB) ===');
        console.log(res.dados);
        console.log('====================================================');
      },
      error: (err) => {
        console.error('Erro ao ler a planilha APB:', err);
        const detail = this.extractErrorMessage(err);
        this.openAlert('Erro no Processamento', `Não foi possível processar a planilha APB:\n${detail}`, 'danger');
      }
    });
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
            this.openAlert('Erro', 'Ocorreu um erro no processamento da conciliação. Verifique a chave de API e a integridade dos arquivos.', 'danger');
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
    const fileName = this.selectedFileApb()?.name || 'conciliacao.xlsx';

    this.importacoesService.exportarConciliacao(dados, fileName).subscribe({
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

        // Reload history
        this.carregarHistorico();

        // Reset file selections
        this.selectedFileApb.set(null);
        this.selectedFilesBanco.set([]);
      },
      error: (err) => {
        this.isExporting.set(false);
        console.error('Erro ao exportar planilha:', err);
        this.openAlert('Erro', 'Não foi possível exportar a planilha de conciliação.', 'danger');
      }
    });
  }

  cancelarConferencia() {
    this.isConferenciaModalOpen.set(false);
    this.conferenciaItems.set([]);
  }
}
