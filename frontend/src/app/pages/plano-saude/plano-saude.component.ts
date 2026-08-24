import { Component, signal, ViewChild, ElementRef, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ImportacoesService, Importacao } from '../../core/services/importacoes.service';
import { ColaboradoresService } from '../../core/services/colaboradores.service';
import { CentrosCustoService } from '../../core/services/centros-custo.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { EmpresasService, Empresa } from '../../core/services/empresas.service';
import { ColaboradorModalComponent } from '../../shared/components/colaborador-modal/colaborador-modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

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
    BadgeComponent,
    ColaboradorModalComponent,
    EmptyStateComponent,
    ConfirmModalComponent
  ],
  templateUrl: './plano-saude.component.html',
  styleUrl: './plano-saude.component.scss'
})
export class PlanoSaudeComponent implements OnInit {

  // Gerenciar Empresas Config
  empresasService = inject(EmpresasService);
  activeConfigTab = signal<'empresas'>('empresas');
  listaEmpresasConfig: Empresa[] = [];
  totalEmpresasConfig = 0;
  totalEmpresaConfigPages = 1;
  currentEmpresaConfigPage = 1;
  itemsEmpresaConfigPerPage = 10;
  searchEmpresaConfig = '';

  isEmpresaModalOpen = false;
  empresaModalMode: 'create' | 'edit' = 'create';
  novaEmpresa: Empresa = { nome: '', descricao: '' };
  isSalvandoEmpresa = false;

  setActiveConfigTab(tab: 'empresas') {
    this.activeConfigTab.set(tab);
    if (tab === 'empresas') {
      this.carregarEmpresasConfig();
    }
  }

  carregarEmpresasConfig() {
    this.empresasService.listar(this.currentEmpresaConfigPage, this.itemsEmpresaConfigPerPage, this.searchEmpresaConfig, 2).subscribe({
      next: (res) => {
        this.listaEmpresasConfig = res.items;
        this.totalEmpresasConfig = res.total;
        this.totalEmpresaConfigPages = res.total_pages;
      },
      error: (err) => console.error('Erro ao carregar empresas', err)
    });
  }

  onSearchEmpresaConfigChange(term: string) {
    this.searchEmpresaConfig = term;
    this.currentEmpresaConfigPage = 1;
    this.carregarEmpresasConfig();
  }

  goToEmpresaConfigPage(page: number) {
    if (page >= 1 && page <= this.totalEmpresaConfigPages) {
      this.currentEmpresaConfigPage = page;
      this.carregarEmpresasConfig();
    }
  }

  openEmpresaModal(empresa?: Empresa) {
    if (empresa) {
      this.empresaModalMode = 'edit';
      this.novaEmpresa = { ...empresa };
    } else {
      this.empresaModalMode = 'create';
      this.novaEmpresa = { nome: '', descricao: '' };
    }
    this.isEmpresaModalOpen = true;
  }

  closeEmpresaModal() {
    this.isEmpresaModalOpen = false;
    this.novaEmpresa = { nome: '', descricao: '' };
  }

  salvarEmpresa() {
    if (!this.novaEmpresa.nome) return;
    this.isSalvandoEmpresa = true;
    
    // Always assign modulo_id = 2 when creating from this module
    if (this.empresaModalMode === 'create') {
      this.novaEmpresa.modulo_id = 2;
    }

    if (this.empresaModalMode === 'create') {
      this.empresasService.criar(this.novaEmpresa).subscribe({
        next: () => {
          this.isSalvandoEmpresa = false;
          this.closeEmpresaModal();
          this.carregarEmpresasConfig();
          this.carregarEmpresasAtualizacao(); // also reload cards
        },
        error: (err) => {
          this.isSalvandoEmpresa = false;
          console.error(err);
        }
      });
    } else if (this.novaEmpresa.idEmpresas) {
      this.empresasService.atualizar(this.novaEmpresa.idEmpresas, this.novaEmpresa).subscribe({
        next: () => {
          this.isSalvandoEmpresa = false;
          this.closeEmpresaModal();
          this.carregarEmpresasConfig();
          this.carregarEmpresasAtualizacao();
        },
        error: (err) => {
          this.isSalvandoEmpresa = false;
          console.error(err);
        }
      });
    }
  }

  // ==========================================
  // CONFIRM MODAL (GENERIC)
  // ==========================================
  isConfirmModalOpen = false;
  confirmTitle = 'Confirmar Exclusão';
  confirmMessage = 'Tem certeza que deseja excluir este registro?';
  isConfirmLoading = false;
  confirmCallback: (() => void) | null = null;

  openConfirmModal(title: string, message: string, callback: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmCallback = callback;
    this.isConfirmModalOpen = true;
    this.isConfirmLoading = false;
  }

  closeConfirmModal() {
    this.isConfirmModalOpen = false;
    this.confirmCallback = null;
  }

  executeConfirm() {
    if (this.confirmCallback) {
      this.isConfirmLoading = true;
      this.confirmCallback();
    }
  }

  confirmarExclusaoEmpresa(id: number) {
    this.openConfirmModal(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta empresa? Isso apagará permanentemente todos os dados associados a ela.',
      () => {
        this.empresasService.excluir(id).subscribe({
          next: () => {
            this.closeConfirmModal();
            this.carregarEmpresasConfig();
            this.carregarEmpresasAtualizacao();
          },
          error: (err) => {
            this.closeConfirmModal();
            console.error(err);
          }
        });
      }
    );
  }


  // Histórico de Importações
  listaImportacoes: Importacao[] = [];
  totalImportacoes = 0;
  totalImportacaoPages = 0;
  currentImportacaoPage = 1;
  itemsImportacaoPerPage = 10;
  searchImportacaoTerm = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') !== null
    ? localStorage.getItem('sidebarCollapsed') === 'true'
    : true;
  sidebarTab = signal<'dashboard' | 'atualizacao' | 'configuracoes'>('atualizacao');
  horizontalTab = signal<'plano-saude' | 'seguro-vida'>('plano-saude');

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.isSidebarCollapsed));
  }

  setSidebarTab(tab: 'dashboard' | 'atualizacao' | 'configuracoes') {
    this.sidebarTab.set(tab);
  }

  setHorizontalTab(tab: 'plano-saude' | 'seguro-vida') {
    this.horizontalTab.set(tab);
    
    // Reset importation history pagination and reload list
    this.currentImportacaoPage = 1;
    this.carregarImportacoes();

    // Automatically select the first company in the newly selected tab
    const filtered = this.empresasAtualizacao.filter(e => {
      const hasSeguro = e.nome.toLowerCase().includes('seguro');
      return tab === 'seguro-vida' ? hasSeguro : !hasSeguro;
    });
    if (filtered.length > 0) {
      const first = filtered[0];
      this.activeCard.set({
        id: first.idEmpresas!.toString(),
        name: first.nome,
        icon: first.icon || 'fa-solid fa-building',
        colorClass: 'color-info',
        status: 'active',
        statusText: 'Importação Disponível',
        statusVariant: 'success',
        description: first.descricao || ''
      });
    } else {
      this.activeCard.set(null);
    }
  }

  importacoesService = inject(ImportacoesService);
  colaboradoresService = inject(ColaboradoresService);
  centrosCustoService = inject(CentrosCustoService);
  unidadesService = inject(UnidadesService);

  colaboradoresList = signal<any[]>([]);
  centrosCustoList = signal<any[]>([]);
  unidadesList = signal<any[]>([]);

  // States for Sorriso health plan import
  parsedTitulares = signal<any[]>([]);
  searchBeneficiaryTerm = signal<string>('');

  filteredParsedTitulares = computed(() => {
    const term = this.searchBeneficiaryTerm().trim().toLowerCase();
    const list = this.parsedTitulares();
    if (!term) return list;
    return list.filter(t => {
      const name = (t.nome_db || t.nome_pdf || '').toLowerCase();
      return name.includes(term);
    });
  });

  totalGeral = signal<number>(0);
  validacoes = signal<any>(null);
  validacoesSucesso = signal<boolean>(true);
  isSaving = signal<boolean>(false);

  // Colaborador modal integration
  isColaboradorModalOpen = false;
  colaboradorToCreateName = '';
  editingColaboradorRowId = signal<number | null>(null);

  openCreateColaboradorModal(id: number, titular: any) {
    this.editingColaboradorRowId.set(id);
    this.colaboradorToCreateName = titular.nome_db || titular.nome_pdf || titular.nome;
    this.isColaboradorModalOpen = true;
  }

  onColaboradorSaved(novoColaborador: any) {
    const id = this.editingColaboradorRowId();
    if (id !== null) {
      const currentList = this.parsedTitulares();
      const updatedList = currentList.map(t => {
        if (t._id === id) {
          return {
            ...t,
            id_db: novoColaborador.idColaborador,
            nome_db: novoColaborador.nome,
            centro_custo: 'Mapeado Manualmente'
          };
        }
        return t;
      });
      
      this.carregarColaboradores();
      this.parsedTitulares.set(updatedList);
      
      const allFound = updatedList.every(t => t.centro_custo !== 'N/D');
      this.validacoesSucesso.set(allFound);
    }
    this.isColaboradorModalOpen = false;
    this.editingColaboradorRowId.set(null);
  }

  // States for inline editing
  editingRowId = signal<number | null>(null);
  editNome = signal<string>('');
  editCentroCusto = signal<string>('');
  editUnidade = signal<string>('');
  editValor = signal<number>(0);

  setParsedTitulares(dados: any[]) {
    const mapped = (dados || []).map((t, idx) => ({ ...t, _id: idx }));
    mapped.sort((a, b) => {
      const nameA = (a.nome_db || a.nome_pdf || '').toLowerCase();
      const nameB = (b.nome_db || b.nome_pdf || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    this.parsedTitulares.set(mapped);
  }

  ngOnInit() {
    this.carregarEmpresasAtualizacao();
    this.carregarEmpresasConfig();
    this.carregarColaboradores();
    this.carregarCentrosCusto();
    this.carregarUnidades();
    this.carregarImportacoes();
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

  activeCards = computed(() => {
    if (this.horizontalTab() === 'plano-saude') {
      return this.cards().filter(c => c.id !== 'seguro-vida');
    }
    return this.cards().filter(c => c.id === 'seguro-vida');
  });

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
    const cardId = this.activeCard()?.id;
    const cardNameLower = this.activeCard()?.name?.toLowerCase() || '';

    if (cardId === 'sorriso') {
      this.isProcessing.set(true);
      this.processingStep.set(1);
      this.processingText.set('Enviando arquivo e extraindo dados pelo Gemini...');

      this.importacoesService.analisarSorriso(this.selectedFile()!).subscribe({
        next: (res) => {
          if (res.sucesso) {
            this.setParsedTitulares(res.dados);
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
    } else if (this.horizontalTab() !== 'seguro-vida' && (cardId === 'unimed-odonto' || cardNameLower.includes('unimed') || cardNameLower.includes('odonto'))) {
      this.isProcessing.set(true);
      this.processingStep.set(1);
      this.processingText.set('Enviando arquivo e extraindo dados pelo Gemini...');

      this.importacoesService.analisarUnimedOdonto(this.selectedFile()!).subscribe({
        next: (res) => {
          if (res.sucesso) {
            this.setParsedTitulares(res.dados);
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
    } else {
      // Dynamic general companies (including Seguros!)
      // Since layout is dynamic, we use the Gemini-based parser (analisarSorriso)
      this.isProcessing.set(true);
      this.processingStep.set(1);
      this.processingText.set('Enviando arquivo e extraindo dados pelo Gemini...');

      this.importacoesService.analisarSorriso(this.selectedFile()!).subscribe({
        next: (res) => {
          if (res.sucesso) {
            this.setParsedTitulares(res.dados);
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
  }

  confirmAndSave() {
    if (!this.selectedFile() || this.parsedTitulares().length === 0) return;

    this.isSaving.set(true);
    this.processingError.set('');

    const activeId = this.activeCard()?.id;
    const cardNameLower = this.activeCard()?.name?.toLowerCase() || '';
    const isSeguroTab = this.horizontalTab() === 'seguro-vida';
    const idEmpresa = (activeId !== 'unimed-odonto' && activeId !== 'sorriso') ? parseInt(activeId || '0') : undefined;

    // Determine whether to use Unimed Odonto schema/endpoint or Sorriso schema/endpoint
    const useUnimedOdontoSchema = !isSeguroTab && (activeId === 'unimed-odonto' || cardNameLower.includes('unimed') || cardNameLower.includes('odonto'));

    if (useUnimedOdontoSchema) {
      this.importacoesService.confirmarUnimedOdonto(this.selectedFile()!.name, this.parsedTitulares(), idEmpresa).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res.sucesso) {
            this.importedCount.set(res.movimentacoes_criadas);
            this.divergencesCount.set(res.erros_colaboradores ? res.erros_colaboradores.length : 0);
            this.processingStep.set(4);
            this.carregarImportacoes();
          } else {
            this.processingError.set('Erro ao salvar os dados.');
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          this.processingError.set(err.error?.detail || 'Erro ao salvar os dados no banco.');
        }
      });
    } else {
      // Use Sorriso schema/endpoint (standard for Gemini dynamic extractions, including Seguros)
      this.importacoesService.confirmarSorriso(this.selectedFile()!.name, this.parsedTitulares(), idEmpresa).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res.sucesso) {
            this.importedCount.set(res.movimentacoes_criadas);
            this.divergencesCount.set(res.erros_colaboradores ? res.erros_colaboradores.length : 0);
            this.processingStep.set(4);
            this.carregarImportacoes();
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
    this.editingRowId.set(null);
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

  startEdit(id: number, titular: any) {
    this.editingRowId.set(id);
    this.editNome.set(titular.nome_db || titular.nome_pdf);
    this.editCentroCusto.set(titular.centro_custo || 'N/D');
    this.editUnidade.set(titular.unidade || 'N/D');
    this.editValor.set(titular.valor_total);
  }

  saveEdit(id: number) {
    const updatedList = [...this.parsedTitulares()];
    const index = updatedList.findIndex(t => t._id === id);
    if (index >= 0) {
      const item = { ...updatedList[index] };
      item.nome_db = this.editNome();
      item.centro_custo = this.editCentroCusto()?.toString() || 'N/D';
      item.unidade = this.editUnidade() || 'N/D';
      item.valor_total = this.editValor();
      updatedList[index] = item;
      
      // Re-sort alphabetically since the name might have changed!
      updatedList.sort((a, b) => {
        const nameA = (a.nome_db || a.nome_pdf || '').toLowerCase();
        const nameB = (b.nome_db || b.nome_pdf || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      this.parsedTitulares.set(updatedList);
      this.editingRowId.set(null);
      this.recalculateTotalGeral();
    }
  }

  cancelEdit() {
    this.editingRowId.set(null);
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

  carregarImportacoes() {
    this.importacoesService.listar(this.currentImportacaoPage, this.itemsImportacaoPerPage, this.searchImportacaoTerm, 'PLANO_SAUDE').subscribe({
      next: (res) => {
        this.listaImportacoes = res.items;
        this.totalImportacoes = res.total;
        this.totalImportacaoPages = res.total_pages;
      },
      error: (err) => console.error('Erro ao carregar importacoes', err)
    });
  }

  onSearchImportacaoChange(term: string) {
    this.searchImportacaoTerm = term;
    this.currentImportacaoPage = 1;
    this.carregarImportacoes();
  }

  goToImportacaoPage(page: number) {
    if (page >= 1 && page <= this.totalImportacaoPages) {
      this.currentImportacaoPage = page;
      this.carregarImportacoes();
    }
  }

  confirmarExclusaoImportacao(id: number) {
    this.openConfirmModal(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta importação? Esta ação removerá permanentemente o registro de histórico e todas as suas movimentações financeiras associadas.',
      () => {
        this.importacoesService.excluir(id).subscribe({
          next: () => {
            this.closeConfirmModal();
            this.carregarImportacoes();
          },
          error: (err) => {
            this.closeConfirmModal();
            console.error(err);
          }
        });
      }
    );
  }


  isDuplicated(nome: string): boolean {
    if (!nome) return false;
    const nameLower = nome.trim().toLowerCase();
    const count = this.parsedTitulares().filter(t => {
      const tName = (t.nome_db || t.nome_pdf || '').trim().toLowerCase();
      return tName === nameLower;
    }).length;
    return count > 1;
  }

  // Empresas for Atualizacao cards
  empresasAtualizacao: Empresa[] = [];

  get filteredEmpresasAtualizacao(): Empresa[] {
    const tab = this.horizontalTab();
    return this.empresasAtualizacao.filter(e => {
      const hasSeguro = e.nome.toLowerCase().includes('seguro');
      if (tab === 'seguro-vida') {
        return hasSeguro;
      } else {
        return !hasSeguro;
      }
    });
  }

  carregarEmpresasAtualizacao() {
    // Busca as empresas vinculadas a este módulo (ID = 2)
    this.empresasService.listar(1, 100, '', 2).subscribe({
      next: (res) => {
        this.empresasAtualizacao = res.items.map(e => {
          // Atribui ícones baseados no nome
          const nomeLower = e.nome.toLowerCase();
          if (nomeLower.includes('seguro')) {
            e.icon = 'fa-solid fa-shield-halved';
          } else if (nomeLower.includes('odonto') || nomeLower.includes('sorriso')) {
            e.icon = 'fa-solid fa-tooth';
          } else {
            e.icon = 'fa-solid fa-briefcase-medical';
          }
          return e;
        });
        
        // Define initial active card based on the current tab
        const tab = this.horizontalTab();
        const filtered = this.empresasAtualizacao.filter(e => {
          const hasSeguro = e.nome.toLowerCase().includes('seguro');
          return tab === 'seguro-vida' ? hasSeguro : !hasSeguro;
        });
        
        if (filtered.length > 0 && (!this.activeCard() || !filtered.find(e => e.idEmpresas?.toString() === this.activeCard()?.id))) {
           const first = filtered[0];
           this.activeCard.set({
              id: first.idEmpresas!.toString(),
              name: first.nome,
              icon: first.icon || 'fa-solid fa-building',
              colorClass: 'color-info',
              status: 'active',
              statusText: 'Importação Disponível',
              statusVariant: 'success',
              description: first.descricao || ''
           });
        }
      },
      error: (err) => console.error('Erro ao carregar empresas atualizacao', err)
    });
  }

}