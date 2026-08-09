import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

import { ColaboradoresService, Colaborador } from '../../core/services/colaboradores.service';
import { CategoriasService, Categoria } from '../../core/services/categorias.service';
import { TiposColaboradoresService, TipoColaborador } from '../../core/services/tipos-colaboradores.service';

import { CentrosCustoService, CentroCusto } from '../../core/services/centros-custo.service';
import { UnidadesService, Unidade } from '../../core/services/unidades.service';
import { ImportacoesService, Importacao } from '../../core/services/importacoes.service';
import { ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-despesas-viagens',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardComponent, ButtonComponent, BadgeComponent, ModalComponent, ConfirmModalComponent],
  templateUrl: './despesas-viagens.component.html',
  styleUrl: './despesas-viagens.component.scss'
})
export class DespesasViagensComponent implements OnInit {
  activeTab: 'dashboard' | 'atualizacao' | 'configuracoes' = 'atualizacao';
  activeConfigTab: 'colaboradores' | 'categorias' | 'centros-custo' | 'unidades' = 'colaboradores';

  constructor(
    private colaboradoresService: ColaboradoresService,
    private categoriasService: CategoriasService,
    private tiposService: TiposColaboradoresService,
    private centrosCustoService: CentrosCustoService,
    private unidadesService: UnidadesService,
    private importacoesService: ImportacoesService
  ) {}

  ngOnInit() {
    this.carregarColaboradores();
    this.carregarCategorias();
    this.carregarTipos();
    this.carregarCentrosCusto();
    this.carregarCentrosCustoGeral();
    this.carregarUnidades();
    this.carregarUnidadesGeral();
    this.carregarImportacoes();
  }

  setActiveTab(tab: 'dashboard' | 'atualizacao' | 'configuracoes') {
    this.activeTab = tab;
  }

  setActiveConfigTab(tab: 'colaboradores' | 'categorias' | 'centros-custo' | 'unidades') {
    this.activeConfigTab = tab;
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

  // ==========================================
  // TIPOS DE COLABORADOR
  // ==========================================
  listaTipos: TipoColaborador[] = [];
  isNovoTipoModalOpen = false;
  tipoModalMode: 'create' | 'edit' = 'create';
  novoTipo: any = { nome: '', descricao: '' };
  isSalvandoTipo = false;

  // ==========================================
  // UNIDADES
  // ==========================================
  searchUnidade = '';
  currentUnidadePage = 1;
  itemsUnidadePerPage = 10;
  totalUnidades = 0;
  totalUnidadePages = 1;
  listaUnidades: Unidade[] = [];
  listaUnidadesGeral: Unidade[] = [];

  unidadeModalMode: 'create' | 'edit' = 'create';
  isUnidadeModalOpen = false;
  novaUnidade: any = { codigo: null, descricao: '' };
  isSalvandoUnidade = false;

  carregarUnidades() {
    this.unidadesService.listar(this.currentUnidadePage, this.itemsUnidadePerPage, this.searchUnidade).subscribe({
      next: (res) => {
        this.listaUnidades = res.items;
        this.totalUnidades = res.total;
        this.totalUnidadePages = res.total_pages;
      },
      error: (err) => console.error('Erro ao carregar unidades', err)
    });
  }

  onSearchUnidadeChange(term: string) {
    this.searchUnidade = term;
    this.currentUnidadePage = 1;
    this.carregarUnidades();
  }

  carregarUnidadesGeral() {
    this.unidadesService.listar(1, 1000).subscribe({
      next: (res) => {
        this.listaUnidadesGeral = res.items;
      }
    });
  }

  goToUnidadePage(page: number) {
    if (page >= 1 && page <= this.totalUnidadePages) {
      this.currentUnidadePage = page;
      this.carregarUnidades();
    }
  }

  openUnidadeModal(unidade?: Unidade) {
    if (unidade) {
      this.unidadeModalMode = 'edit';
      this.novaUnidade = { ...unidade };
    } else {
      this.unidadeModalMode = 'create';
      this.novaUnidade = { codigo: null, descricao: '' };
    }
    this.isUnidadeModalOpen = true;
  }

  closeUnidadeModal() {
    this.isUnidadeModalOpen = false;
  }

  salvarUnidade() {
    this.isSalvandoUnidade = true;
    if (this.unidadeModalMode === 'create') {
      this.unidadesService.criar(this.novaUnidade).subscribe({
        next: () => {
          this.isSalvandoUnidade = false;
          this.closeUnidadeModal();
          this.carregarUnidades();
          this.carregarUnidadesGeral();
        },
        error: (err) => { console.error(err); this.isSalvandoUnidade = false; }
      });
    } else {
      this.unidadesService.atualizar(this.novaUnidade.idUnidade, this.novaUnidade).subscribe({
        next: () => {
          this.isSalvandoUnidade = false;
          this.closeUnidadeModal();
          this.carregarUnidades();
          this.carregarUnidadesGeral();
        },
        error: (err) => { console.error(err); this.isSalvandoUnidade = false; }
      });
    }
  }

  confirmarExclusaoUnidade(id: number) {
    this.openConfirmModal('Excluir Unidade', 'Tem certeza que deseja excluir esta Unidade?', () => {
      this.unidadesService.excluir(id).subscribe({
        next: () => {
          this.closeConfirmModal();
          this.carregarUnidades();
          this.carregarUnidadesGeral();
        },
        error: (err) => {
          console.error(err);
          this.closeConfirmModal();
        }
      });
    });
  }

  carregarTipos() {
    this.tiposService.listar(1, 100).subscribe({
      next: (res) => this.listaTipos = res.items,
      error: (err) => console.error('Erro ao carregar tipos', err)
    });
  }

  openNovoTipoModal() {
    this.tipoModalMode = 'create';
    this.novoTipo = { nome: '', descricao: '' };
    this.isNovoTipoModalOpen = true;
  }

  closeNovoTipoModal() {
    this.isNovoTipoModalOpen = false;
  }

  editarTipo(tipo: TipoColaborador) {
    this.tipoModalMode = 'edit';
    this.novoTipo = { ...tipo };
  }

  cancelarEdicaoTipo() {
    this.tipoModalMode = 'create';
    this.novoTipo = { nome: '', descricao: '' };
  }

  salvarNovoTipo() {
    this.isSalvandoTipo = true;
    if (this.tipoModalMode === 'create') {
      this.tiposService.criar(this.novoTipo).subscribe({
        next: (tipo) => {
          if (tipo.idTipoColaborador) {
            this.novoColaborador.idTipoColaborador = tipo.idTipoColaborador;
          }
          this.isSalvandoTipo = false;
          this.carregarTipos();
          this.cancelarEdicaoTipo();
        },
        error: (err: any) => {
          console.error('Erro ao salvar tipo', err);
          this.isSalvandoTipo = false;
        }
      });
    } else {
      this.tiposService.atualizar(this.novoTipo.idTipoColaborador, this.novoTipo).subscribe({
        next: () => {
          this.isSalvandoTipo = false;
          this.carregarTipos();
          this.cancelarEdicaoTipo();
        },
        error: (err: any) => {
          console.error('Erro ao atualizar tipo', err);
          this.isSalvandoTipo = false;
        }
      });
    }
  }

  confirmarExclusaoTipo(id: number) {
    this.openConfirmModal('Excluir Tipo de Vínculo', 'Tem certeza que deseja excluir este tipo? Caso existam colaboradores vinculados, você poderá ter problemas.', () => {
      this.tiposService.excluir(id).subscribe({
        next: () => {
          this.closeConfirmModal();
          this.carregarTipos();
          // Se estava editando o mesmo que foi excluido, reseta
          if (this.novoTipo.idTipoColaborador === id) {
            this.cancelarEdicaoTipo();
          }
        },
        error: (err: any) => {
          console.error(err);
          this.isConfirmLoading = false;
        }
      });
    });
  }

  // ==========================================
  // COLABORADORES
  // ==========================================
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalColaboradores = 0;
  totalPages = 1;
  listaColaboradores: Colaborador[] = [];
  
  colaboradorModalMode: 'create' | 'edit' = 'create';
  isColaboradorModalOpen = false;
  novoColaborador: any = { nome: '', idCentroCusto: null, idTipoColaborador: null };
  isSalvandoColaborador = false;

  carregarColaboradores() {
    this.colaboradoresService.listar(this.currentPage, this.itemsPerPage).subscribe({
      next: (res) => {
        this.listaColaboradores = res.items;
        this.totalColaboradores = res.total;
        this.totalPages = res.total_pages;
      },
      error: (err) => console.error('Erro ao carregar colaboradores', err)
    });
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.currentPage = 1;
    this.carregarColaboradores();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.carregarColaboradores();
    }
  }

  openColaboradorModal(colaborador?: Colaborador) {
    if (colaborador) {
      this.colaboradorModalMode = 'edit';
      this.novoColaborador = { ...colaborador };
    } else {
      this.colaboradorModalMode = 'create';
      this.novoColaborador = { nome: '', idCentroCusto: null, idTipoColaborador: null, idUnidade: null };
    }
    this.isColaboradorModalOpen = true;
  }

  closeColaboradorModal() {
    this.isColaboradorModalOpen = false;
  }

  salvarColaborador() {
    this.isSalvandoColaborador = true;
    if (this.colaboradorModalMode === 'create') {
      this.colaboradoresService.criar(this.novoColaborador).subscribe({
        next: () => {
          this.isSalvandoColaborador = false;
          this.closeColaboradorModal();
          this.carregarColaboradores();
        },
        error: (err) => { console.error(err); this.isSalvandoColaborador = false; }
      });
    } else {
      this.colaboradoresService.atualizar(this.novoColaborador.idColaborador, this.novoColaborador).subscribe({
        next: () => {
          this.isSalvandoColaborador = false;
          this.closeColaboradorModal();
          this.carregarColaboradores();
        },
        error: (err) => { console.error(err); this.isSalvandoColaborador = false; }
      });
    }
  }

  confirmarExclusaoColaborador(id: number) {
    this.openConfirmModal('Excluir Colaborador', 'Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.', () => {
      this.colaboradoresService.excluir(id).subscribe({
        next: () => {
          this.closeConfirmModal();
          this.carregarColaboradores();
        },
        error: (err) => {
          console.error(err);
          this.isConfirmLoading = false;
        }
      });
    });
  }

  // ==========================================
  // CATEGORIAS
  // ==========================================
  searchCategoria = '';
  currentCategoriaPage = 1;
  itemsCategoriaPerPage = 10;
  totalCategorias = 0;
  totalCategoriaPages = 1;
  listaCategorias: Categoria[] = [];

  categoriaModalMode: 'create' | 'edit' = 'create';
  isCategoriaModalOpen = false;
  novaCategoria: any = { nome: '', descricao: '' };
  isSalvandoCategoria = false;

  carregarCategorias() {
    this.categoriasService.listar(this.currentCategoriaPage, this.itemsCategoriaPerPage, this.searchCategoria).subscribe({
      next: (res) => {
        this.listaCategorias = res.items;
        this.totalCategorias = res.total;
        this.totalCategoriaPages = res.total_pages;
      },
      error: (err) => console.error('Erro ao carregar categorias', err)
    });
  }

  onSearchCategoriaChange(term: string) {
    this.searchCategoria = term;
    this.currentCategoriaPage = 1;
    this.carregarCategorias();
  }

  goToCategoriaPage(page: number) {
    if (page >= 1 && page <= this.totalCategoriaPages) {
      this.currentCategoriaPage = page;
      this.carregarCategorias();
    }
  }

  openCategoriaModal(categoria?: Categoria) {
    if (categoria) {
      this.categoriaModalMode = 'edit';
      this.novaCategoria = { ...categoria };
    } else {
      this.categoriaModalMode = 'create';
      this.novaCategoria = { nome: '', descricao: '' };
    }
    this.isCategoriaModalOpen = true;
  }

  closeCategoriaModal() {
    this.isCategoriaModalOpen = false;
  }

  salvarCategoria() {
    this.isSalvandoCategoria = true;
    if (this.categoriaModalMode === 'create') {
      this.categoriasService.criar(this.novaCategoria).subscribe({
        next: () => {
          this.isSalvandoCategoria = false;
          this.closeCategoriaModal();
          this.carregarCategorias();
        },
        error: (err) => { console.error(err); this.isSalvandoCategoria = false; }
      });
    } else {
      this.categoriasService.atualizar(this.novaCategoria.idCategorias, this.novaCategoria).subscribe({
        next: () => {
          this.isSalvandoCategoria = false;
          this.closeCategoriaModal();
          this.carregarCategorias();
        },
        error: (err) => { console.error(err); this.isSalvandoCategoria = false; }
      });
    }
  }

  confirmarExclusaoCategoria(id: number) {
    this.openConfirmModal('Excluir Categoria', 'Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.', () => {
      this.categoriasService.excluir(id).subscribe({
        next: () => {
          this.closeConfirmModal();
          this.carregarCategorias();
        },
        error: (err) => {
          console.error(err);
          this.isConfirmLoading = false;
        }
      });
    });
  }

  // ==========================================
  // CENTROS DE CUSTO
  // ==========================================
  searchCentroCusto = '';
  currentCentroCustoPage = 1;
  itemsCentroCustoPerPage = 10;
  totalCentrosCusto = 0;
  totalCentroCustoPages = 1;
  listaCentrosCusto: CentroCusto[] = [];
  listaCentrosCustoGeral: CentroCusto[] = []; // Para popular selects

  centroCustoModalMode: 'create' | 'edit' = 'create';
  isCentroCustoModalOpen = false;
  novoCentroCusto: any = { codigo: null, nome: '', estados: [] };
  isSalvandoCentroCusto = false;

  estadosBrasil = [
    'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo', 
    'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 
    'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 
    'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
  ];

  carregarCentrosCusto() {
    this.centrosCustoService.listar(this.currentCentroCustoPage, this.itemsCentroCustoPerPage, this.searchCentroCusto).subscribe({
      next: (res) => {
        this.listaCentrosCusto = res.items;
        this.totalCentrosCusto = res.total;
        this.totalCentroCustoPages = res.total_pages;
      },
      error: (err) => console.error('Erro ao carregar centros de custo', err)
    });
  }

  onSearchCentroCustoChange(term: string) {
    this.searchCentroCusto = term;
    this.currentCentroCustoPage = 1;
    this.carregarCentrosCusto();
  }

  carregarCentrosCustoGeral() {
    this.centrosCustoService.listar(1, 1000).subscribe({
      next: (res) => {
        this.listaCentrosCustoGeral = res.items;
      }
    });
  }

  goToCentroCustoPage(page: number) {
    if (page >= 1 && page <= this.totalCentroCustoPages) {
      this.currentCentroCustoPage = page;
      this.carregarCentrosCusto();
    }
  }

  openCentroCustoModal(centro?: CentroCusto) {
    if (centro) {
      this.centroCustoModalMode = 'edit';
      this.novoCentroCusto = { ...centro, estados: [...(centro.estados || [])] };
    } else {
      this.centroCustoModalMode = 'create';
      this.novoCentroCusto = { codigo: null, nome: '', estados: [] };
    }
    this.isCentroCustoModalOpen = true;
  }

  closeCentroCustoModal() {
    this.isCentroCustoModalOpen = false;
  }
  
  toggleEstado(estado: string) {
    const index = this.novoCentroCusto.estados.indexOf(estado);
    if (index > -1) {
      this.novoCentroCusto.estados.splice(index, 1);
    } else {
      this.novoCentroCusto.estados.push(estado);
    }
  }

  salvarCentroCusto() {
    this.isSalvandoCentroCusto = true;
    if (this.centroCustoModalMode === 'create') {
      this.centrosCustoService.criar(this.novoCentroCusto).subscribe({
        next: () => {
          this.isSalvandoCentroCusto = false;
          this.closeCentroCustoModal();
          this.carregarCentrosCusto();
          this.carregarCentrosCustoGeral();
        },
        error: (err) => { console.error(err); this.isSalvandoCentroCusto = false; }
      });
    } else {
      this.centrosCustoService.atualizar(this.novoCentroCusto.idCentroCusto, this.novoCentroCusto).subscribe({
        next: () => {
          this.isSalvandoCentroCusto = false;
          this.closeCentroCustoModal();
          this.carregarCentrosCusto();
          this.carregarCentrosCustoGeral();
        },
        error: (err) => { console.error(err); this.isSalvandoCentroCusto = false; }
      });
    }
  }

  confirmarExclusaoCentroCusto(id: number) {
    this.openConfirmModal('Excluir Centro de Custo', 'Tem certeza que deseja excluir este Centro de Custo? Isso afetará colaboradores vinculados.', () => {
      this.centrosCustoService.excluir(id).subscribe({
        next: () => {
          this.closeConfirmModal();
          this.carregarCentrosCusto();
          this.carregarCentrosCustoGeral();
        },
        error: (err: any) => {
          console.error(err);
          this.isConfirmLoading = false;
        }
      });
    });
  }

  // ==========================================
  // ==========================================
  // IMPORTAÇÕES
  // ==========================================
  
  listaImportacoes: Importacao[] = [];
  totalImportacoes = 0;
  totalImportacaoPages = 1;
  currentImportacaoPage = 1;
  itemsImportacaoPerPage = 10;
  searchImportacaoTerm = '';

  carregarImportacoes() {
    this.importacoesService.listar(this.currentImportacaoPage, this.itemsImportacaoPerPage, this.searchImportacaoTerm).subscribe({
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

  reprocessarImportacao(importacao: Importacao) {
    // Apenas mock de funcionalidade por agora
    alert('Função de reprocessamento em desenvolvimento para a importação: ' + importacao.nomeArquivo);
  }

  // ==========================================
  // OUTROS / MOCKS ANTIGOS (Importação, etc)
  // ==========================================
  empresas = [
    { nome: 'Cartão Corporativo BB', icon: 'fa-solid fa-credit-card' },
    { nome: 'Cartão Corporativo Santa Maria', icon: 'fa-regular fa-credit-card' },
    { nome: 'Kinto', icon: 'fa-solid fa-car-side' },
    { nome: 'Localiza', icon: 'fa-solid fa-car' },
    { nome: 'Maiorca', icon: 'fa-solid fa-map-location-dot' },
    { nome: 'Onfly', icon: 'fa-solid fa-plane-departure' },
    { nome: 'DV', icon: 'fa-solid fa-file-invoice-dollar' },
    { nome: 'Sem Parar', icon: 'fa-solid fa-road-barrier' },
    { nome: 'Tastur', icon: 'fa-solid fa-ticket' }
  ];



  isImportModalOpen = false;
  empresaSelecionada: any = null;
  uploadState: 'idle' | 'processing' | 'done' = 'idle';
  currentProcessingStep = 0;
  processingSteps = [
    'Importando Dados',
    'Inteligência Artificial analisando dados',
    'Interpretando dados importados',
    'Gravando dados',
    'Finalizando Importação'
  ];

  openImportModal(empresa: any) {
    this.empresaSelecionada = empresa;
    this.isImportModalOpen = true;
    this.uploadState = 'idle';
    this.currentProcessingStep = 0;
  }

  closeImportModal() {
    this.isImportModalOpen = false;
  }

  iniciarProcessamento() {
    this.uploadState = 'processing';
    this.currentProcessingStep = 0;
    
    const stepInterval = setInterval(() => {
      this.currentProcessingStep++;
      if (this.currentProcessingStep >= this.processingSteps.length) {
        clearInterval(stepInterval);
        this.uploadState = 'done';
        setTimeout(() => this.closeImportModal(), 2000);
      }
    }, 1500);
  }

  isImportColabModalOpen = false;
  uploadColabState: 'idle' | 'processing' | 'done' | 'error' = 'idle';
  currentColabStep = 0;
  processingColabSteps = [
    'Analisando importação',
    'Verificando base de dados',
    'Atualizando base de dados'
  ];
  uploadColabError = '';
  uploadColabSummary: any = null;

  @ViewChild('colabFileInput') colabFileInput!: ElementRef<HTMLInputElement>;

  openImportColabModal() {
    this.isImportColabModalOpen = true;
    this.uploadColabState = 'idle';
    this.currentColabStep = 0;
    this.uploadColabError = '';
    this.uploadColabSummary = null;
    if (this.colabFileInput?.nativeElement) {
      this.colabFileInput.nativeElement.value = '';
    }
  }

  closeImportColabModal() {
    this.isImportColabModalOpen = false;
  }

  onColabFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.iniciarProcessamentoColab(event.target.files[0]);
    }
  }

  async iniciarProcessamentoColab(file?: File) {
    if (!file && this.colabFileInput?.nativeElement?.files?.length) {
      file = this.colabFileInput.nativeElement.files[0];
    }
    
    if (!file) return;

    this.uploadColabState = 'processing';
    this.currentColabStep = 0;
    this.uploadColabError = '';
    this.uploadColabSummary = null;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.colaboradoresService.getApiUrl()}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.body) throw new Error('No readable stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let done = false;
      let partialData = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          partialData += decoder.decode(value, { stream: true });
          
          const lines = partialData.split('\n');
          // keep the last chunk if it's incomplete
          partialData = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              const data = JSON.parse(line);
              
              if (data.status === 'error') {
                this.uploadColabState = 'error';
                this.uploadColabError = data.message;
                return;
              }

              this.currentColabStep = data.step;
              
              if (data.status === 'success') {
                this.uploadColabState = 'done';
                this.uploadColabSummary = data.summary;
                this.carregarColaboradores(); // refresh list
                setTimeout(() => this.closeImportColabModal(), 5000);
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      this.uploadColabState = 'error';
      this.uploadColabError = 'Erro ao conectar ao servidor.';
    }
  }
}
