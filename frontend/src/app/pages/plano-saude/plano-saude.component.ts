import { Component, signal, ViewChild, ElementRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ImportacoesService } from '../../core/services/importacoes.service';
import { ColaboradoresService } from '../../core/services/colaboradores.service';
import { CentrosCustoService } from '../../core/services/centros-custo.service';
import { UnidadesService } from '../../core/services/unidades.service';

export interface HealthPlanCard {
  id: string;
  name: string;
  icon: string;
  colorClass: string;
  status: 'active' | 'upcoming';
  statusText: string;
  statusVariant: 'success' | 'warning' | 'info' | 'primary' | 'secondary';
  description: string;
}

@Component({
  selector: 'app-plano-saude',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NgSelectModule,
    CardComponent,
    ButtonComponent,
    ModalComponent,
    LoadingComponent,
    BadgeComponent
  ],
  templateUrl: './plano-saude.component.html',
  styleUrl: './plano-saude.component.scss'
})
export class PlanoSaudeComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  importacoesService = inject(ImportacoesService);
  colaboradoresService = inject(ColaboradoresService);
  centrosCustoService = inject(CentrosCustoService);
  unidadesService = inject(UnidadesService);

  colaboradoresList = signal<any[]>([]);
  centrosCustoList = signal<any[]>([]);
  unidadesList = signal<any[]>([]);

  // States for Sorriso health plan import
  parsedTitulares = signal<any[]>([]);
  totalGeral = signal<number>(0);
  validacoes = signal<any>(null);
  validacoesSucesso = signal<boolean>(true);
  isSaving = signal<boolean>(false);

  // States for inline editing
  editingRowIndex = signal<number | null>(null);
  editNome = signal<string>('');
  editCentroCusto = signal<string>('');
  editUnidade = signal<string>('');
  editValor = signal<number>(0);

  ngOnInit() {
    this.carregarColaboradores();
    this.carregarCentrosCusto();
    this.carregarUnidades();
  }

  carregarColaboradores() {
    this.colaboradoresService.listar(1, 2000).subscribe({
      next: (res) => {
        const list = res.items || [];
        this.colaboradoresList.set(list.sort((a, b) => a.nome.localeCompare(b.nome)));
      }
    });
  }

  carregarCentrosCusto() {
    this.centrosCustoService.listar(1, 200).subscribe({
      next: (res) => {
        const list = res.items || [];
        this.centrosCustoList.set(list.sort((a, b) => a.codigo - b.codigo));
      }
    });
  }

  carregarUnidades() {
    this.unidadesService.listar(1, 200).subscribe({
      next: (res) => {
        const list = res.items || [];
        this.unidadesList.set(list.sort((a, b) => a.descricao.localeCompare(b.descricao)));
      }
    });
  }

  cards = signal<HealthPlanCard[]>([
    {
      id: 'unimed-norte-paulista',
      name: 'Unimed Norte Paulista',
      icon: 'fa-solid fa-notes-medical',
      colorClass: 'text-success bg-success-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success',
      description: 'Importação de faturas e composição de custos Unimed Norte Paulista.'
    },
    {
      id: 'seguro-vida',
      name: 'Seguro de Vida',
      icon: 'fa-solid fa-hand-holding-heart',
      colorClass: 'text-primary bg-primary-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success',
      description: 'Importação de apólices e controle de movimentação de Seguro de Vida.'
    },
    {
      id: 'seguro-saude',
      name: 'Seguro Saude',
      icon: 'fa-solid fa-heart-pulse',
      colorClass: 'text-primary bg-primary-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success',
      description: 'Importação e conciliação de faturas de Seguro Saúde corporativo.'
    },
    {
      id: 'seguro-unimed',
      name: 'Seguro Unimed',
      icon: 'fa-solid fa-shield-halved',
      colorClass: 'text-success bg-success-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success',
      description: 'Importação e cruzamento de guias e faturas do Seguro Unimed.'
    },
    {
      id: 'sorriso',
      name: 'Sorriso',
      icon: 'fa-solid fa-tooth',
      colorClass: 'text-info bg-info-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success',
      description: 'Importação de faturas e planos odontológicos Sorriso.'
    },
    {
      id: 'unimed-odonto',
      name: 'Unimed Odonto',
      icon: 'fa-solid fa-smile-beam',
      colorClass: 'text-info bg-info-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success',
      description: 'Importação de demonstrativos e faturas odontológicas Unimed Odonto.'
    },
    {
      id: 'capixaba',
      name: 'Capixaba',
      icon: 'fa-solid fa-hospital',
      colorClass: 'text-warning bg-warning-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success',
      description: 'Importação de guias e demonstrativos de custos Capixaba Saúde.'
    }
  ]);

  activeCard = signal<HealthPlanCard | null>(null);
  selectedFile = signal<File | null>(null);
  isUploadModalOpen = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  processingStep = signal<number>(0);
  processingText = signal<string>('');
  processingError = signal<string>('');
  importedCount = signal<number>(0);
  divergencesCount = signal<number>(0);

  triggerImport(card: HealthPlanCard) {
    this.activeCard.set(card);
    this.selectedFile.set(null);
    this.processingError.set('');
    this.processingStep.set(0);
    this.isProcessing.set(false);
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
      this.isUploadModalOpen.set(true);
    }
  }

  processFile() {
    if (!this.selectedFile() || !this.activeCard()) return;

    this.processingError.set('');

    if (this.activeCard()?.id === 'sorriso') {
      this.isProcessing.set(true);
      this.processingStep.set(1);
      this.processingText.set('Enviando arquivo e extraindo dados pelo Gemini...');

      this.importacoesService.analisarSorriso(this.selectedFile()!).subscribe({
        next: (res) => {
          if (res.sucesso) {
            this.parsedTitulares.set(res.dados);
            this.totalGeral.set(res.total_geral);
            this.validacoes.set(res.validacoes);
            this.validacoesSucesso.set(res.validacoes_sucesso);
            this.processingStep.set(5);
            this.isProcessing.set(false);
          } else {
            this.processingError.set('Erro ao analisar arquivo.');
            this.isProcessing.set(false);
          }
        },
        error: (err) => {
          this.processingError.set(err.error?.detail || 'Erro ao comunicar com o servidor.');
          this.isProcessing.set(false);
        }
      });
      return;
    } else if (this.activeCard()?.id === 'unimed-odonto') {
      this.isProcessing.set(true);
      this.processingStep.set(1);
      this.processingText.set('Enviando arquivo e extraindo dados pelo Gemini...');

      this.importacoesService.analisarUnimedOdonto(this.selectedFile()!).subscribe({
        next: (res) => {
          if (res.sucesso) {
            this.parsedTitulares.set(res.dados);
            this.totalGeral.set(res.total_geral);
            this.validacoes.set(res.validacoes);
            this.validacoesSucesso.set(res.validacoes_sucesso);
            this.processingStep.set(5);
            this.isProcessing.set(false);
          } else {
            this.processingError.set('Erro ao analisar arquivo.');
            this.isProcessing.set(false);
          }
        },
        error: (err) => {
          this.processingError.set(err.error?.detail || 'Erro ao comunicar com o servidor.');
          this.isProcessing.set(false);
        }
      });
      return;
    }

    this.isProcessing.set(true);
    this.processingStep.set(1);
    this.processingText.set('Lendo e validando a estrutura do arquivo...');

    // Simulate stepping through import steps
    setTimeout(() => {
      this.processingStep.set(2);
      this.processingText.set('Cruzando beneficiários ativos com a folha de pagamento...');
      
      setTimeout(() => {
        this.processingStep.set(3);
        this.processingText.set('Apurando valores coparticipados e mensalidades...');
        
        setTimeout(() => {
          // Final result
          const simulatedTotal = Math.floor(Math.random() * 150) + 20;
          const simulatedDivergences = Math.floor(Math.random() * 5);
          
          this.importedCount.set(simulatedTotal);
          this.divergencesCount.set(simulatedDivergences);
          this.processingStep.set(4);
          this.isProcessing.set(false);
        }, 1500);
      }, 1500);
    }, 1500);
  }

  confirmAndSave() {
    if (!this.selectedFile() || this.parsedTitulares().length === 0) return;

    this.isSaving.set(true);
    this.processingError.set('');

    if (this.activeCard()?.id === 'sorriso') {
      this.importacoesService.confirmarSorriso(this.selectedFile()!.name, this.parsedTitulares()).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res.sucesso) {
            this.importedCount.set(res.movimentacoes_criadas);
            this.divergencesCount.set(res.erros_colaboradores ? res.erros_colaboradores.length : 0);
            this.processingStep.set(4);
          } else {
            this.processingError.set('Erro ao salvar os dados.');
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          this.processingError.set(err.error?.detail || 'Erro ao salvar os dados no banco.');
        }
      });
    } else if (this.activeCard()?.id === 'unimed-odonto') {
      this.importacoesService.confirmarUnimedOdonto(this.selectedFile()!.name, this.parsedTitulares()).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res.sucesso) {
            this.importedCount.set(res.movimentacoes_criadas);
            this.divergencesCount.set(res.erros_colaboradores ? res.erros_colaboradores.length : 0);
            this.processingStep.set(4);
          } else {
            this.processingError.set('Erro ao salvar os dados.');
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          this.processingError.set(err.error?.detail || 'Erro ao salvar os dados no banco.');
        }
      });
    }
  }

  closeModal() {
    this.isUploadModalOpen.set(false);
    this.activeCard.set(null);
    this.selectedFile.set(null);
    this.processingStep.set(0);
    this.editingRowIndex.set(null);
  }

  onColaboradorSelected(colabNome: string) {
    const colab = this.colaboradoresList().find(c => c.nome === colabNome);
    if (colab) {
      if (colab.centro_custo) {
        this.editCentroCusto.set(colab.centro_custo.codigo.toString());
      }
      if (colab.unidade) {
        this.editUnidade.set(colab.unidade.codigo.toString());
      }
    }
  }

  // Inline editing methods
  onEditNomeChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.editNome.set(val);
  }

  onEditCCChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.editCentroCusto.set(val);
  }

  onEditValorChange(event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.editValor.set(val);
  }

  startEdit(index: number, titular: any) {
    this.editingRowIndex.set(index);
    this.editNome.set(titular.nome_db || titular.nome_pdf);
    this.editCentroCusto.set(titular.centro_custo || 'N/D');
    this.editUnidade.set(titular.unidade || 'N/D');
    this.editValor.set(titular.valor_total);
  }

  saveEdit(index: number) {
    const updatedList = [...this.parsedTitulares()];
    const item = { ...updatedList[index] };
    
    item.nome_db = this.editNome();
    item.centro_custo = this.editCentroCusto()?.toString() || 'N/D';
    item.unidade = this.editUnidade() || 'N/D';
    item.valor_total = this.editValor();
    
    updatedList[index] = item;
    this.parsedTitulares.set(updatedList);
    this.editingRowIndex.set(null);
    this.recalculateTotalGeral();
  }

  cancelEdit() {
    this.editingRowIndex.set(null);
  }

  recalculateTotalGeral() {
    const sum = this.parsedTitulares().reduce((acc, curr) => acc + (curr.valor_total || 0), 0);
    this.totalGeral.set(sum);
  }

  exportToExcel() {
    if (this.parsedTitulares().length === 0) return;

    if (this.activeCard()?.id === 'sorriso') {
      this.importacoesService.exportarSorrisoExcel(this.parsedTitulares()).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'planilha_consolidada_sorriso.xlsx';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.processingError.set('Erro ao exportar planilha Excel.');
        }
      });
    } else if (this.activeCard()?.id === 'unimed-odonto') {
      this.importacoesService.exportarUnimedOdontoExcel(this.parsedTitulares()).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'planilha_consolidada_unimed_odonto.xlsx';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.processingError.set('Erro ao exportar planilha Excel.');
        }
      });
    }
  }
}
