import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxEchartsDirective } from 'ngx-echarts';
import * as echarts from 'echarts';
import { EChartsOption } from 'echarts';
import { HttpClient } from '@angular/common/http';

import { ColaboradoresService, Colaborador } from '../../core/services/colaboradores.service';
import { CategoriasService, Categoria } from '../../core/services/categorias.service';
import { CargosColaboradoresService, CargoColaborador } from '../../core/services/cargos-colaboradores.service';

import { CentrosCustoService, CentroCusto } from '../../core/services/centros-custo.service';
import { UnidadesService, Unidade } from '../../core/services/unidades.service';
import { ImportacoesService, Importacao, DespesaExtraida } from '../../core/services/importacoes.service';
import { EmpresasService, Empresa } from '../../core/services/empresas.service';
import { ViewChild, ElementRef, HostListener } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { FlatpickrModule } from 'angularx-flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt.js';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-despesas-viagens',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgSelectModule, CardComponent, ButtonComponent, BadgeComponent, ModalComponent, ConfirmModalComponent, NgxEchartsDirective, FlatpickrModule, SkeletonComponent],
  templateUrl: './despesas-viagens.component.html',
  styleUrl: './despesas-viagens.component.scss'
})
export class DespesasViagensComponent implements OnInit {
  isDashboardLoading = false;
  activeTab: 'dashboard' | 'atualizacao' | 'configuracoes' = 'dashboard';
  activeConfigTab: 'colaboradores' | 'categorias' | 'centros-custo' | 'unidades' | 'empresas' = 'colaboradores';
  activeDashboardTab: 'visao-geral' | 'categorias' | 'comercial-marketing' | 'relatorio' = 'visao-geral';

  isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') !== null
    ? localStorage.getItem('sidebarCollapsed') === 'true'
    : true;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.isSidebarCollapsed));
  }

  // Dashboard Refs & Status
  @ViewChild('dashboardWrapper') dashboardWrapper!: ElementRef;
  @ViewChild('dashboardContent') dashboardContent!: ElementRef;
  isFullscreen = false;

  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  // Filtros Dashboard
  locale = Portuguese;

  dashDataInicio: Date | null = null;
  dashDataFim: Date | null = null;
  activePeriodShortcut: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado' | 'personalizado' | null = null;

  dashFiltroEmpresa: string = null as any;
  dashFiltroPessoa: string = null as any;
  dashFiltroCategoria: string = null as any;

  // KPIs da aba Categorias
  topCategoryName = 'N/A';
  topCategoryValue = 0;
  maiorCrescimentoName = 'N/A';
  maiorCrescimentoPct = 0;

  // Seleção e interatividade de categorias
  selectedCategoryName: string | null = null;
  selectedCategoryId: number | null = null;
  categoryDetailsLoading = false;

  categoryVisaoGeral = {
    total: 0,
    quantidadeDespesas: 0,
    ticketMedio: 0,
    maiorDespesa: 0,
    maiorDespesaContexto: ''
  };
  categoryTabelaDespesas: any[] = [];
  categorySpenders: any[] = [];
  categoryEmpresasOption: EChartsOption = {};

  chartOptionAreaCategorias: EChartsOption = {};
  chartOptionDonutCategoriaTab: EChartsOption = {};
  donutCategoriasTab: any[] = [];

  dashVisaoGeral = {
    total: 0,
    quantidadeDespesas: 0,
    totalMes: 0,
    percentualMes: 0,
    ticketMedio: 0,
    ticketMedioPercentual: 0,
    maiorDespesa: 0,
    maiorDespesaContexto: 'Sem registros'
  };

  chartOptionArea: EChartsOption = {};
  chartOptionDonutCategoria: EChartsOption = {};
  chartOptionDonutEmpresa: EChartsOption = {};
  chartOptionMapa: EChartsOption = {};

  tabelaMaioresDespesas: any[] = [];

  themeService = inject(ThemeService);

  getThemeColors() {
    const isDark = this.themeService.activeTheme() === 'dark';
    return {
      text: isDark ? '#cbd5e1' : '#64748b',
      title: isDark ? '#f8fafc' : '#334155',
      border: isDark ? '#334155' : '#cbd5e1',
      borderLight: isDark ? '#0ea5e9' : '#f1f5f9',
      pieBorderColor: isDark ? '#014f75' : '#fff'
    };
  }

  constructor(
    private http: HttpClient,
    private colaboradoresService: ColaboradoresService,
    private categoriasService: CategoriasService,
    private cargosService: CargosColaboradoresService,
    private centrosCustoService: CentrosCustoService,
    private unidadesService: UnidadesService,
    private importacoesService: ImportacoesService,
    private empresasService: EmpresasService
  ) {
    effect(() => {
      // Registrar dependência reativa do Signal do tema
      const theme = this.themeService.activeTheme();

      // Forçar atualização dos gráficos recreando suas opções
      if (this.activeTab === 'dashboard') {
        this.carregarDadosDashboard();
        if (this.selectedCategoryId) {
          this.carregarDetalhesCategoria();
        }
        this.atualizarDadosAnalitico();
        this.atualizarDadosRelatorio();
      }
    });
  }

  ngOnInit(): void {
    this.carregarColaboradores();
    this.carregarCategorias();
    this.carregarCargos();
    this.carregarCentrosCusto();
    this.carregarUnidades();
    this.carregarImportacoes();
    this.carregarEmpresas();
    this.carregarColaboradoresGeral();
    this.carregarCategoriasGeral();
    this.carregarEmpresasGeral();
    this.carregarEmpresasConfig();
    this.carregarCentrosCustoGeral();
    this.carregarUnidadesGeral();
    this.selecionarAtalhoPeriodo('este-ano');
    this.selecionarAtalhoPeriodoAnalitico('este-ano');
    this.selecionarAtalhoPeriodoRelatorio('este-ano');
  }

  carregarDadosDashboard() {
    this.isDashboardLoading = true;
    const filtros: any = {};
    if (this.dashDataInicio) {
      filtros.data_inicio = this.formatDate(this.dashDataInicio);
    }
    if (this.dashDataFim) {
      filtros.data_fim = this.formatDate(this.dashDataFim);
    }

    if (this.dashFiltroEmpresa) {
      filtros.id_empresa = this.dashFiltroEmpresa;
    }
    if (this.dashFiltroPessoa) {
      filtros.id_colaborador = this.dashFiltroPessoa;
    }
    if (this.dashFiltroCategoria) {
      filtros.id_categoria = this.dashFiltroCategoria;
    }

    this.importacoesService.obterDadosDashboard(filtros).subscribe({
      next: (res) => {
        this.dashVisaoGeral = res.dashVisaoGeral;
        this.tabelaMaioresDespesas = res.tabelaMaioresDespesas;
        this.donutCategoriasTab = res.donutCategorias || [];

        // Calcular Categoria com Maior Gasto
        if (res.donutCategorias && res.donutCategorias.length > 0) {
          let maxCat = res.donutCategorias[0];
          for (const cat of res.donutCategorias) {
            if (cat.value > maxCat.value) {
              maxCat = cat;
            }
          }
          this.topCategoryName = maxCat.name;
          this.topCategoryValue = maxCat.value;
        } else {
          this.topCategoryName = 'N/A';
          this.topCategoryValue = 0;
        }

        // Maior crescimento
        if (res.maiorCrescimento) {
          this.maiorCrescimentoName = res.maiorCrescimento.name || 'N/A';
          this.maiorCrescimentoPct = res.maiorCrescimento.percentage || 0;
        } else {
          this.maiorCrescimentoName = 'N/A';
          this.maiorCrescimentoPct = 0;
        }

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
        const themeColors = this.getThemeColors();
        const isDark = this.themeService.activeTheme() === 'dark';

        // 1. Area Chart (Evolução)
        this.chartOptionArea = {
          color: colors,
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: themeColors.text } },
          grid: { top: 30, left: 20, right: 20, bottom: 40, containLabel: true },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: res.evolucao.meses,
            axisLabel: { color: themeColors.text, fontSize: 11 },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: themeColors.border } }
          },
          yAxis: {
            type: 'value',
            axisLabel: { formatter: 'R$ {value}', color: themeColors.text, fontSize: 11 },
            splitLine: { lineStyle: { color: themeColors.borderLight } }
          },
          series: res.evolucao.series.map((s: any) => ({
            name: s.name,
            type: 'line',
            stack: 'Total',
            areaStyle: {},
            emphasis: { focus: 'series' },
            data: s.data
          }))
        };

        this.chartOptionAreaCategorias = {
          color: colors,
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: themeColors.text } },
          grid: { top: 30, left: 20, right: 20, bottom: 40, containLabel: true },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: res.evolucao.meses,
            axisLabel: { color: themeColors.text, fontSize: 11 },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: themeColors.border } }
          },
          yAxis: {
            type: 'value',
            axisLabel: { formatter: 'R$ {value}', color: themeColors.text, fontSize: 11 },
            splitLine: { lineStyle: { color: themeColors.borderLight } }
          },
          series: res.evolucao.series.map((s: any) => ({
            name: s.name,
            type: 'line',
            stack: 'Total',
            areaStyle: {},
            emphasis: { focus: 'series' },
            data: s.data
          }))
        };

        // 2. Donut Categorias
        this.chartOptionDonutCategoria = {
          color: colors,
          tooltip: { trigger: 'item', formatter: '{b}: R$ {c} ({d}%)' },
          legend: { show: false },
          series: [
            {
              type: 'pie',
              radius: ['40%', '65%'],
              avoidLabelOverlap: true,
              itemStyle: { borderRadius: 6, borderColor: themeColors.pieBorderColor, borderWidth: 2 },
              label: {
                show: true,
                position: 'outer',
                formatter: '{b}\n{d}%',
                fontSize: 10,
                color: themeColors.text
              },
              labelLine: { show: true, length: 8, length2: 8 },
              data: res.donutCategorias
            }
          ]
        };

        this.chartOptionDonutCategoriaTab = {
          color: colors,
          tooltip: { trigger: 'item', formatter: '{b}: R$ {c} ({d}%)' },
          legend: { show: false },
          series: [
            {
              type: 'pie',
              radius: ['40%', '65%'],
              avoidLabelOverlap: true,
              itemStyle: { borderRadius: 6, borderColor: themeColors.pieBorderColor, borderWidth: 2 },
              label: {
                show: true,
                position: 'outer',
                formatter: '{b}\n{d}%',
                fontSize: 10,
                color: themeColors.text
              },
              labelLine: { show: true, length: 8, length2: 8 },
              data: res.donutCategorias
            }
          ]
        };

        // 3. Donut Empresas
        this.chartOptionDonutEmpresa = {
          color: ['#06b6d4', '#8b5cf6', '#f43f5e', '#eab308'],
          tooltip: { trigger: 'item', formatter: '{b}: R$ {c} ({d}%)' },
          legend: { show: false },
          series: [
            {
              type: 'pie',
              radius: ['40%', '65%'],
              avoidLabelOverlap: true,
              itemStyle: { borderRadius: 6, borderColor: themeColors.pieBorderColor, borderWidth: 2 },
              label: {
                show: true,
                position: 'outer',
                formatter: '{b}\n{d}%',
                fontSize: 10,
                color: themeColors.text
              },
              labelLine: { show: true, length: 8, length2: 8 },
              data: res.donutEmpresas
            }
          ]
        };

        // 4. Map (chartOptionMapa)
        this.http.get('/maps/brazil.json').subscribe({
          next: (geoJson: any) => {
            echarts.registerMap('brazil', geoJson);

            const maxVal = Math.max(1000, ...res.mapaData.map((d: any) => d.value));

            this.chartOptionMapa = {
              tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                  return `${params.name}<br/>Total: R$ ${params.value || 0}<br/>Qtd: ${params.data?.qtd || 0} despesas`;
                }
              },
              visualMap: {
                min: 0,
                max: maxVal,
                text: ['Alto', 'Baixo'],
                realtime: false,
                calculable: true,
                textStyle: { color: themeColors.text },
                inRange: { color: isDark ? ['#172554', '#3b82f6', '#60a5fa'] : ['#eff6ff', '#3b82f6', '#1e3a8a'] }
              },
              series: [
                {
                  name: 'Despesas por Estado',
                  type: 'map',
                  map: 'brazil',
                  roam: true,
                  label: { show: false },
                  data: res.mapaData
                }
              ]
            };

            if (this.selectedCategoryId) {
              this.carregarDetalhesCategoria();
            } else {
              this.isDashboardLoading = false;
            }
          },
          error: (mapErr) => {
            console.error('Erro ao carregar mapa do Brasil', mapErr);
            this.isDashboardLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('Erro ao carregar dados do dashboard', err);
        this.isDashboardLoading = false;
      }
    });
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  setActiveTab(tab: 'dashboard' | 'atualizacao' | 'configuracoes') {
    this.activeTab = tab;
  }

  setActiveConfigTab(tab: 'colaboradores' | 'categorias' | 'centros-custo' | 'unidades' | 'empresas'): void {
    this.activeConfigTab = tab;
  }

  setActiveDashboardTab(tab: 'visao-geral' | 'categorias' | 'comercial-marketing' | 'relatorio'): void {
    this.activeDashboardTab = tab;
    if (tab === 'relatorio') {
      this.atualizarDadosRelatorio();
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

  // ==========================================
  // CARGOS DE COLABORADOR
  // ==========================================
  listaCargos: CargoColaborador[] = [];
  isNovoCargoModalOpen = false;
  cargoModalMode: 'create' | 'edit' = 'create';
  novoCargo: any = { nome: '', descricao: '' };
  isSalvandoCargo = false;

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
        this.listaUnidadesGeral = (res.items || []).sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''));
      }
    });
  }

  listaColaboradoresGeral: Colaborador[] = [];
  carregarColaboradoresGeral() {
    this.colaboradoresService.listar(1, 2000).subscribe({
      next: (res) => this.listaColaboradoresGeral = (res.items || []).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    });
  }

  listaCategoriasGeral: Categoria[] = [];
  carregarCategoriasGeral() {
    this.categoriasService.listar(1, 1000).subscribe({
      next: (res) => this.listaCategoriasGeral = (res.items || []).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    });
  }

  listaEmpresasGeral: any[] = [];
  carregarEmpresasGeral() {
    this.empresasService.listar(1, 1000, '', 1).subscribe({
      next: (res) => this.listaEmpresasGeral = (res.items || []).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
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

  carregarCargos() {
    this.cargosService.listar(1, 100).subscribe({
      next: (res) => this.listaCargos = res.items,
      error: (err) => console.error('Erro ao carregar cargos', err)
    });
  }

  openNovoCargoModal() {
    this.cargoModalMode = 'create';
    this.novoCargo = { nome: '', descricao: '' };
    this.isNovoCargoModalOpen = true;
  }

  closeNovoCargoModal() {
    this.isNovoCargoModalOpen = false;
  }

  editarCargo(cargo: CargoColaborador) {
    this.cargoModalMode = 'edit';
    this.novoCargo = { ...cargo };
  }

  cancelarEdicaoCargo() {
    this.cargoModalMode = 'create';
    this.novoCargo = { nome: '', descricao: '' };
  }

  salvarNovoCargo() {
    this.isSalvandoCargo = true;
    if (this.cargoModalMode === 'create') {
      this.cargosService.criar(this.novoCargo).subscribe({
        next: (cargo) => {
          if (cargo.idCargoColaborador) {
            this.novoColaborador.idCargoColaborador = cargo.idCargoColaborador;
          }
          this.isSalvandoCargo = false;
          this.carregarCargos();
          this.cancelarEdicaoCargo();
        },
        error: (err: any) => {
          console.error('Erro ao salvar cargo', err);
          this.isSalvandoCargo = false;
        }
      });
    } else {
      this.cargosService.atualizar(this.novoCargo.idCargoColaborador, this.novoCargo).subscribe({
        next: () => {
          this.isSalvandoCargo = false;
          this.carregarCargos();
          this.cancelarEdicaoCargo();
        },
        error: (err: any) => {
          console.error('Erro ao atualizar cargo', err);
          this.isSalvandoCargo = false;
        }
      });
    }
  }

  confirmarExclusaoCargo(id: number) {
    this.openConfirmModal('Excluir Cargo de Vínculo', 'Tem certeza que deseja excluir este cargo? Caso existam colaboradores vinculados, você poderá ter problemas.', () => {
      this.cargosService.excluir(id).subscribe({
        next: () => {
          this.closeConfirmModal();
          this.carregarCargos();
          // Se estava editando o mesmo que foi excluido, reseta
          if (this.novoCargo.idCargoColaborador === id) {
            this.cancelarEdicaoCargo();
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
  novoColaborador: any = { nome: '', idCentroCusto: null, idCargoColaborador: null, idUnidade: null, papel: '' };
  isSalvandoColaborador = false;

  carregarColaboradores() {
    this.colaboradoresService.listar(this.currentPage, this.itemsPerPage, this.searchTerm).subscribe({
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
      this.novoColaborador = { nome: '', idCentroCusto: null, idCargoColaborador: null, idUnidade: null, papel: '' };
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
          this.carregarColaboradoresGeral();
        },
        error: (err) => { console.error(err); this.isSalvandoColaborador = false; }
      });
    } else {
      this.colaboradoresService.atualizar(this.novoColaborador.idColaborador, this.novoColaborador).subscribe({
        next: () => {
          this.isSalvandoColaborador = false;
          this.closeColaboradorModal();
          this.carregarColaboradores();
          this.carregarColaboradoresGeral();
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
          this.carregarColaboradoresGeral();
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
          this.carregarCategoriasGeral();
        },
        error: (err) => { console.error(err); this.isSalvandoCategoria = false; }
      });
    } else {
      this.categoriasService.atualizar(this.novaCategoria.idCategorias, this.novaCategoria).subscribe({
        next: () => {
          this.isSalvandoCategoria = false;
          this.closeCategoriaModal();
          this.carregarCategorias();
          this.carregarCategoriasGeral();
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
          this.carregarCategoriasGeral();
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
        this.listaCentrosCustoGeral = (res.items || []).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
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
  // OUTROS / MOCKS ANTIGOS E EMPRESAS DA API
  // ==========================================
  empresas: Empresa[] = [];

  // Variáveis para a aba de Configuração de Empresas
  searchEmpresaConfig = '';
  currentEmpresaConfigPage = 1;
  itemsEmpresaConfigPerPage = 10;
  totalEmpresasConfig = 0;
  totalEmpresaConfigPages = 1;
  listaEmpresasConfig: Empresa[] = [];

  empresaModalMode: 'create' | 'edit' = 'create';
  isEmpresaModalOpen = false;
  novaEmpresa: any = { nome: '', descricao: '' };
  isSalvandoEmpresa = false;

  carregarEmpresasConfig() {
    this.empresasService.listar(this.currentEmpresaConfigPage, this.itemsEmpresaConfigPerPage, this.searchEmpresaConfig, 1).subscribe({
      next: (res) => {
        this.listaEmpresasConfig = res.items;
        this.totalEmpresasConfig = res.total;
        this.totalEmpresaConfigPages = res.total_pages;
      },
      error: (err) => console.error('Erro ao carregar empresas para config', err)
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
  }

  salvarEmpresa() {
    this.isSalvandoEmpresa = true;
    if (this.empresaModalMode === 'create') {
      this.empresasService.criar(this.novaEmpresa).subscribe({
        next: () => {
          this.isSalvandoEmpresa = false;
          this.closeEmpresaModal();
          this.carregarEmpresasConfig();
          this.carregarEmpresas(); // Atualiza os cards
          this.carregarEmpresasGeral();
        },
        error: (err) => { console.error(err); this.isSalvandoEmpresa = false; }
      });
    } else {
      this.empresasService.atualizar(this.novaEmpresa.idEmpresas, this.novaEmpresa).subscribe({
        next: () => {
          this.isSalvandoEmpresa = false;
          this.closeEmpresaModal();
          this.carregarEmpresasConfig();
          this.carregarEmpresas(); // Atualiza os cards
          this.carregarEmpresasGeral();
        },
        error: (err) => { console.error(err); this.isSalvandoEmpresa = false; }
      });
    }
  }

  confirmarExclusaoEmpresa(id: number) {
    this.openConfirmModal('Excluir Empresa', 'Tem certeza que deseja excluir esta Empresa (fatura/extrato)?', () => {
      this.empresasService.excluir(id).subscribe({
        next: () => {
          this.closeConfirmModal();
          this.carregarEmpresasConfig();
          this.carregarEmpresas(); // Atualiza os cards
          this.carregarEmpresasGeral();
        },
        error: (err) => {
          console.error(err);
          this.isConfirmLoading = false;
        }
      });
    });
  }

  confirmarExclusaoImportacao(id: number) {
    this.openConfirmModal('Excluir Importação', 'Tem certeza que deseja excluir esta importação? Isso apagará permanentemente todas as movimentações e despesas associadas a ela.', () => {
      this.importacoesService.excluir(id).subscribe({
        next: () => {
          this.closeConfirmModal();
          this.carregarImportacoes(); // Atualiza a grid
          this.carregarEmpresas(); // Atualiza os cards
        },
        error: (err) => {
          console.error(err);
          this.isConfirmLoading = false;
        }
      });
    });
  }

  carregarEmpresas() {
    this.empresasService.listar(1, 100, '', 1).subscribe({
      next: (res) => {
        this.empresas = res.items.map(e => {
          // Mapeia alguns ícones baseados no nome da empresa por padrão visual
          let icon = 'fa-solid fa-building';
          const nomeLower = e.nome.toLowerCase();

          if (nomeLower.includes('cartão') || nomeLower.includes('bb')) icon = 'fa-solid fa-credit-card';
          else if (nomeLower.includes('kinto') || nomeLower.includes('localiza')) icon = 'fa-solid fa-car';
          else if (nomeLower.includes('onfly')) icon = 'fa-solid fa-plane-departure';
          else if (nomeLower.includes('dv') || nomeLower.includes('despesa')) icon = 'fa-solid fa-file-invoice-dollar';
          else if (nomeLower.includes('sem parar')) icon = 'fa-solid fa-road-barrier';
          else if (nomeLower.includes('tastur') || nomeLower.includes('viagem')) icon = 'fa-solid fa-ticket';

          return { ...e, icon };
        });
      },
      error: (err) => console.error('Erro ao carregar empresas', err)
    });
  }



  isImportModalOpen = false;
  empresaSelecionada: any = null;
  uploadState: 'idle' | 'processing' | 'done' = 'idle';
  currentProcessingStep = 0;
  processingSteps = [
    'Importando arquivo selecionado',
    'Inteligência Artificial analisando dados (pode levar alguns segundos)',
    'Interpretando resposta e formatando tabela',
    'Pronto para conferência'
  ];

  openImportModal(empresa: any) {
    this.empresaSelecionada = empresa;
    this.isImportModalOpen = true;
    this.uploadState = 'idle';
    this.currentProcessingStep = 0;
    this.selectedFileName = '';

    // Garantir que as listas estejam atualizadas com as configurações mais recentes
    this.carregarColaboradoresGeral();
    this.carregarCategoriasGeral();
    this.carregarEmpresasGeral();
  }

  closeImportModal() {
    this.isImportModalOpen = false;
  }

  isSalvandoExtraidos = false;

  salvarExtraidos() {
    if (this.despesasExtraidas.length === 0) return;

    this.isSalvandoExtraidos = true;
    this.importacoesService.salvarExtraidos(this.selectedFileName, this.despesasExtraidas).subscribe({
      next: (res) => {
        this.isSalvandoExtraidos = false;
        this.closeImportModal();
        this.despesasExtraidas = [];
        this.selectedFileName = '';
        this.carregarImportacoes(); // Recarrega a tabela de historico
        // Como não temos um toast de sucesso global no momento, o modal se fechará e a grid atualizará.
      },
      error: (err) => {
        this.isSalvandoExtraidos = false;
        this.showErrorToast(err?.error?.detail || 'Erro ao salvar os dados. Verifique se todos os cadastros selecionados existem.');
      }
    });
  }

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  despesasExtraidas: DespesaExtraida[] = [];
  selectedFileName: string = '';

  get totalDespesasExtraidas(): number {
    return this.despesasExtraidas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }

  hasColaborador(nome: string): boolean {
    return this.listaColaboradoresGeral.some(c => c.nome === nome);
  }

  hasEmpresa(nome: string): boolean {
    return this.listaEmpresasGeral.some(e => e.nome === nome);
  }

  hasCategoria(nome: string): boolean {
    return this.listaCategoriasGeral.some(c => c.nome === nome);
  }

  adicionarLinhaEmBranco() {
    this.despesasExtraidas = [...this.despesasExtraidas, {
      empresa: this.empresaSelecionada?.nome || 'Empresa Desconhecida',
      colaborador: '',
      categoria: '',
      valor: 0
    }];
  }

  removerLinha(index: number) {
    this.despesasExtraidas.splice(index, 1);
    this.despesasExtraidas = [...this.despesasExtraidas];
  }

  selectedFile: File | null = null;

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      this.selectedFile = file;
    } else {
      this.selectedFileName = '';
      this.selectedFile = null;
    }
  }

  toastMessage: string | null = null;
  showErrorToast(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => this.toastMessage = null, 5000);
  }

  iniciarProcessamento() {
    if (!this.selectedFile) {
      this.showErrorToast("Por favor, selecione um arquivo primeiro.");
      return;
    }

    const file = this.selectedFile;
    this.uploadState = 'processing';
    this.currentProcessingStep = 0;

    // Passo 0 para Passo 1
    setTimeout(() => {
      this.currentProcessingStep = 1;

      const nomeEmpresa = this.empresaSelecionada?.nome || 'Empresa Desconhecida';
      this.importacoesService.analisarExtrato(file, nomeEmpresa).subscribe({
        next: (res) => {
          if (res.sucesso) {
            // Arredondando todos os valores retornados para 2 casas decimais e associando a empresa selecionada no card
            this.despesasExtraidas = res.dados.map((d: any) => ({
              ...d,
              empresa: this.empresaSelecionada?.nome || 'Empresa Desconhecida',
              valor: Number(parseFloat(d.valor).toFixed(2))
            }));

            this.currentProcessingStep = 2; // Interpretando...
            setTimeout(() => {
              this.currentProcessingStep = 3; // Pronto para conferência...
              setTimeout(() => {
                this.uploadState = 'done';
              }, 600);
            }, 600);
          } else {
            this.showErrorToast('Erro ao processar arquivo pela IA.');
            this.uploadState = 'idle';
          }
        },
        error: (err) => {
          console.error(err);
          this.showErrorToast(err?.error?.detail || 'Erro de conexão ou processamento com a IA. Tente novamente.');
          this.uploadState = 'idle';
        }
      });
    }, 500);
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
                this.carregarColaboradoresGeral(); // refresh general list
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

  // Ações do Dashboard
  async exportToPDF() {
    if (!this.dashboardContent) return;

    try {
      const element = this.dashboardContent.nativeElement;
      
      // Obter cor de fundo do tema dinamicamente
      const computedStyle = getComputedStyle(document.documentElement);
      const bgCol = computedStyle.getPropertyValue('--color-bg').trim() || '#ffffff';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: bgCol,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          // Remover estilos que quebram o html2canvas (sticky e max-height overflow) apenas no clone!
          const stickyEls = clonedDoc.querySelectorAll('.sticky-col-left, .sticky-col-right');
          stickyEls.forEach((el: any) => {
            el.style.position = 'static';
          });
          
          const scrollEls = clonedDoc.querySelectorAll('.table-responsive');
          scrollEls.forEach((el: any) => {
            el.style.maxHeight = 'none';
            // Em vez de overflow visible (que pode colapsar a div), apenas garantimos height auto
            el.style.height = 'auto';
            el.style.overflow = 'hidden'; // Evita scrollbars visíveis no PDF
          });
        }
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('A renderização retornou uma imagem vazia ou o elemento está oculto.');
      }

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdfHeightPage = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(bgCol);
      pdf.rect(0, 0, pdfWidth, pdfHeightPage, 'F');

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('dashboard-despesas-viagens.pdf');
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF: ' + (error?.message || error));
    }
  }

  exportRelatorioToExcel() {
    if (!this.relatorioDetalhesMatrizFiltrada || this.relatorioDetalhesMatrizFiltrada.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const header = [
      'COLABORADOR',
      'EMPRESA',
      'CENTRO DE CUSTO',
      ...this.relatorioDetalhesCategoriasColunas,
      'TOTAL'
    ];

    const dataRows = this.relatorioDetalhesMatrizFiltrada.map(row => {
      const r = [
        row.colaboradorNome || '-',
        row.empresaNome || '-',
        row.centroCustoCodigo || '-'
      ];
      this.relatorioDetalhesCategoriasColunas.forEach(cat => {
        r.push(row.valoresPorCategoria[cat] || 0);
      });
      r.push(row.total || 0);
      return r;
    });

    const footerRow: any[] = [
      'TOTAL GERAL',
      '',
      ''
    ];
    this.relatorioDetalhesCategoriasColunas.forEach(cat => {
      footerRow.push(this.relatorioDetalhesTotaisPorCategoria[cat] || 0);
    });
    footerRow.push(this.relatorioDetalhesTotalGeral || 0);

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([header, ...dataRows, footerRow]);

    worksheet['!views'] = [{
      state: 'frozen',
      xSplit: 1,
      ySplit: 1
    }];

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Despesas');
    
    XLSX.writeFile(workbook, 'relatorio-despesas-viagens.xlsx');
  }

  toggleFullscreen() {
    const elem = this.dashboardWrapper?.nativeElement;

    if (!document.fullscreenElement) {
      if (elem?.requestFullscreen) {
        elem.requestFullscreen().catch((err: any) => {
          console.error(`Erro ao tentar entrar em modo tela cheia: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  onDataInicioChange() {
    if (this.dashDataInicio && this.dashDataFim && this.dashDataInicio > this.dashDataFim) {
      this.dashDataFim = this.dashDataInicio;
    }
    this.activePeriodShortcut = 'personalizado';
    if (this.isPeriodoValido()) {
      this.carregarDadosDashboard();
    }
  }

  onDataFimChange() {
    this.activePeriodShortcut = 'personalizado';
    if (this.isPeriodoValido()) {
      this.carregarDadosDashboard();
    }
  }

  onShortcutSelectChange(val: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado' | 'personalizado') {
    if (val && val !== 'personalizado') {
      this.selecionarAtalhoPeriodo(val);
    }
  }

  isPeriodoValido(): boolean {
    if (!this.dashDataInicio && !this.dashDataFim) {
      return true;
    }
    return !!this.dashDataInicio && !!this.dashDataFim && this.dashDataInicio <= this.dashDataFim;
  }

  selecionarAtalhoPeriodo(shortcut: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado') {
    const today = new Date();

    const getPastDate = (monthsAgo: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - monthsAgo);
      return d;
    };

    if (shortcut === 'ultimo-bimestre') {
      this.dashDataInicio = getPastDate(2);
      this.dashDataFim = today;
    } else if (shortcut === 'ultimo-semestre') {
      this.dashDataInicio = getPastDate(6);
      this.dashDataFim = today;
    } else if (shortcut === 'este-ano') {
      this.dashDataInicio = new Date(today.getFullYear(), 0, 1);
      this.dashDataFim = new Date(today.getFullYear(), 11, 31);
    } else if (shortcut === 'ano-passado') {
      this.dashDataInicio = new Date(today.getFullYear() - 1, 0, 1);
      this.dashDataFim = new Date(today.getFullYear() - 1, 11, 31);
    }

    this.activePeriodShortcut = shortcut;
    this.carregarDadosDashboard();
  }

  selecionarCategoria(name: string, id: number) {
    if (this.selectedCategoryId === id) {
      this.selectedCategoryName = null;
      this.selectedCategoryId = null;
    } else {
      this.selectedCategoryName = name;
      this.selectedCategoryId = id;
      this.carregarDetalhesCategoria();
    }
  }

  carregarDetalhesCategoria() {
    if (!this.selectedCategoryId) return;

    this.categoryDetailsLoading = true;

    const filtros: any = {
      id_categoria: this.selectedCategoryId
    };
    if (this.dashDataInicio) {
      filtros.data_inicio = this.formatDate(this.dashDataInicio);
    }
    if (this.dashDataFim) {
      filtros.data_fim = this.formatDate(this.dashDataFim);
    }
    if (this.dashFiltroEmpresa) {
      filtros.id_empresa = this.dashFiltroEmpresa;
    }
    if (this.dashFiltroPessoa) {
      filtros.id_colaborador = this.dashFiltroPessoa;
    }

    this.importacoesService.obterDadosDashboard(filtros).subscribe({
      next: (res) => {
        this.categoryVisaoGeral = {
          total: res.dashVisaoGeral.total,
          quantidadeDespesas: res.dashVisaoGeral.quantidadeDespesas,
          ticketMedio: res.dashVisaoGeral.ticketMedio,
          maiorDespesa: res.dashVisaoGeral.maiorDespesa,
          maiorDespesaContexto: res.dashVisaoGeral.maiorDespesaContexto
        };
        this.categoryTabelaDespesas = res.tabelaMaioresDespesas;
        this.categorySpenders = res.spenders || [];

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
        const themeColors = this.getThemeColors();
        this.categoryEmpresasOption = {
          color: colors,
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { top: 20, left: 10, right: 20, bottom: 20, containLabel: true },
          xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
          yAxis: {
            type: 'category',
            data: (res.donutEmpresas || []).map((e: any) => e.name),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: themeColors.text }
          },
          series: [
            {
              name: 'Valor',
              type: 'bar',
              barWidth: '60%',
              label: {
                show: true,
                position: 'right',
                formatter: (params: any) => {
                  const val = params.value;
                  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                },
                fontSize: 10,
                color: themeColors.text
              },
              data: (res.donutEmpresas || []).map((e: any) => e.value)
            }
          ]
        };

        this.categoryDetailsLoading = false;
        this.isDashboardLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar detalhes da categoria', err);
        this.categoryDetailsLoading = false;
        this.isDashboardLoading = false;
      }
    });
  }

  // ==========================================
  // ABA COMERCIAL/MARKETING — DADOS E GRÁFICOS
  // ==========================================

  // Filtros Comercial/Marketing
  analiticoDataInicio: Date | null = null;
  analiticoDataFim: Date | null = null;
  analiticoPeriodShortcut: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado' | 'personalizado' | null = null;
  analiticoCategoria: string | null = null;
  analiticoColaborador: string | null = null;
  analiticoCentroCusto: string | null = null;
  isAnaliticoDetalhesActive = false;

  toggleAnaliticoDetalhes() {
    this.isAnaliticoDetalhesActive = !this.isAnaliticoDetalhesActive;
  }

  analiticoRankingTab: 'colaboradores' | 'categorias' = 'colaboradores';
  rankingColaboradores: { posicao: number, nome: string, valor: number, pct: number }[] = [];
  rankingCategorias: { posicao: number, nome: string, valor: number, pct: number }[] = [];

  setAnaliticoRankingTab(tab: 'colaboradores' | 'categorias') {
    this.analiticoRankingTab = tab;
  }

  // Detalhes Matrix Grid
  searchDetalhesTerm = '';
  detalhesCategoriasColunas: string[] = [];
  detalhesMatrizOriginal: { colaboradorNome: string, valoresPorCategoria: { [cat: string]: number }, total: number }[] = [];
  detalhesMatrizFiltrada: { colaboradorNome: string, valoresPorCategoria: { [cat: string]: number }, total: number }[] = [];
  detalhesTotaisPorCategoria: { [cat: string]: number } = {};
  detalhesTotalGeral = 0;

  onSearchDetalhesChange(term: string) {
    this.searchDetalhesTerm = term;
    this.filtrarDetalhesMatriz();
  }

  filtrarDetalhesMatriz() {
    if (!this.searchDetalhesTerm || !this.searchDetalhesTerm.trim()) {
      this.detalhesMatrizFiltrada = [...this.detalhesMatrizOriginal];
      return;
    }
    const term = this.searchDetalhesTerm.toLowerCase().trim();
    this.detalhesMatrizFiltrada = this.detalhesMatrizOriginal.filter(item =>
      item.colaboradorNome.toLowerCase().includes(term) ||
      item.total.toString().includes(term)
    );
  }

  // KPI
  analiticoTotalDespesas = 0;

  // Charts
  chartAnaliticoBarrasVerticais: EChartsOption = {};
  chartAnaliticoCategoriaBarras: EChartsOption = {};
  chartAnaliticoCategoriaDonut: EChartsOption = {};
  chartAnaliticoButterfly: EChartsOption = {};
  chartAnaliticoEvolucaoLinha: EChartsOption = {};
  chartAnaliticoCentroCusto: EChartsOption = {};
  chartAnaliticoMapa: EChartsOption = {};

  onAnaliticoDataInicioChange() {
    if (this.analiticoDataInicio && this.analiticoDataFim && this.analiticoDataInicio > this.analiticoDataFim) {
      this.analiticoDataFim = this.analiticoDataInicio;
    }
    this.analiticoPeriodShortcut = 'personalizado';
    this.atualizarDadosAnalitico();
  }

  onAnaliticoDataFimChange() {
    this.analiticoPeriodShortcut = 'personalizado';
    this.atualizarDadosAnalitico();
  }

  onAnaliticoShortcutSelectChange(val: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado' | 'personalizado') {
    if (val && val !== 'personalizado') {
      this.selecionarAtalhoPeriodoAnalitico(val);
    }
  }

  selecionarAtalhoPeriodoAnalitico(shortcut: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado') {
    const today = new Date();
    const getPastDate = (monthsAgo: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - monthsAgo);
      return d;
    };

    if (shortcut === 'ultimo-bimestre') {
      this.analiticoDataInicio = getPastDate(2);
      this.analiticoDataFim = today;
    } else if (shortcut === 'ultimo-semestre') {
      this.analiticoDataInicio = getPastDate(6);
      this.analiticoDataFim = today;
    } else if (shortcut === 'este-ano') {
      this.analiticoDataInicio = new Date(today.getFullYear(), 0, 1);
      this.analiticoDataFim = new Date(today.getFullYear(), 11, 31);
    } else if (shortcut === 'ano-passado') {
      this.analiticoDataInicio = new Date(today.getFullYear() - 1, 0, 1);
      this.analiticoDataFim = new Date(today.getFullYear() - 1, 11, 31);
    }

    this.analiticoPeriodShortcut = shortcut;
    this.atualizarDadosAnalitico();
  }




  // --- Comercial/Marketing ---
  isAnaliticoLoading = false;
  analiticoDetalhes: any[] = [];


  atualizarDadosAnalitico() {
    this.isAnaliticoLoading = true;

    const filtros = {
      data_inicio: this.analiticoDataInicio ? this.analiticoDataInicio.toISOString().split('T')[0] : null,
      data_fim: this.analiticoDataFim ? this.analiticoDataFim.toISOString().split('T')[0] : null,
      id_empresa: null,
      id_colaborador: this.analiticoColaborador || null,
      id_categoria: this.analiticoCategoria || null
    };

    this.importacoesService.obterDadosDashboardAnalitico(filtros).subscribe({
      next: (dados) => {
        this.isAnaliticoLoading = false;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e'];
        const themeColors = this.getThemeColors();
        const isDark = this.themeService.activeTheme() === 'dark';

        this.analiticoTotalDespesas = dados.analiticoTotalDespesas;

        // 3. Barras verticais
        this.chartAnaliticoBarrasVerticais = {
          color: [colors[0]],
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
              const p = params[0];
              return `${p.name}<br/>Total: ${p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            }
          },
          grid: { top: 30, left: 20, right: 20, bottom: 30, containLabel: true },
          xAxis: {
            type: 'category',
            data: dados.meses,
            axisLabel: { fontSize: 11, color: themeColors.text },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: themeColors.border } }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (val: number) => val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`,
              fontSize: 11,
              color: themeColors.text
            },
            splitLine: { lineStyle: { color: themeColors.borderLight } }
          },
          series: [{
            name: 'Total',
            type: 'bar',
            barWidth: '50%',
            itemStyle: { borderRadius: [4, 4, 0, 0] },
            data: dados.barrasVerticais
          }]
        };

        // 4. Barras horizontais categorias e 5. Donut
        const catNames = dados.categoriaBarras.map((c: any) => c.name);
        const catNamesAsc = [...catNames].reverse();
        const catValuesAsc = dados.categoriaBarras.map((c: any) => c.value).reverse();

        this.chartAnaliticoCategoriaBarras = {
          color: colors,
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
              const p = params[0];
              return `${p.name}<br/>Total: ${p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            }
          },
          grid: { top: 10, left: 10, right: 80, bottom: 10, containLabel: true },
          xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
          yAxis: {
            type: 'category',
            data: catNamesAsc,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { fontSize: 11, color: themeColors.text, width: 120, overflow: 'truncate' }
          },
          series: [{
            name: 'Valor',
            type: 'bar',
            barWidth: '60%',
            itemStyle: { borderRadius: [0, 4, 4, 0] },
            label: {
              show: true,
              position: 'right',
              formatter: (params: any) => params.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              fontSize: 10,
              color: themeColors.text
            },
            data: catValuesAsc.map((v: any, i: number) => ({ value: v, itemStyle: { color: colors[i % colors.length] } }))
          }]
        };

        this.chartAnaliticoCategoriaDonut = {
          color: colors,
          tooltip: { trigger: 'item', formatter: '{b}: R$ {c} ({d}%)' },
          legend: { show: false },
          series: [{
            type: 'pie',
            radius: ['40%', '65%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 6, borderColor: themeColors.pieBorderColor, borderWidth: 2 },
            label: {
              show: true,
              position: 'outer',
              formatter: '{b}\n{d}%',
              fontSize: 10,
              color: themeColors.text
            },
            labelLine: { show: true, length: 8, length2: 8 },
            data: dados.categoriaBarras
          }]
        };

        // 5.b Butterfly Chart (Comercial vs Marketing por Categoria)
        const bf = dados.butterfly;
        const butterflyCats = bf.categorias;
        const comValues = bf.comercial.map((v: number) => -v);
        const mktValues = bf.marketing;

        this.chartAnaliticoButterfly = {
          color: ['#3b82f6', '#ec4899'],
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
              let res = `<strong>${params[0].name}</strong><br/>`;
              params.forEach((p: any) => {
                const val = Math.abs(p.value);
                res += `${p.marker} ${p.seriesName}: ${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br/>`;
              });
              return res;
            }
          },
          legend: {
            data: ['Comercial', 'Marketing'],
            top: 0,
            textStyle: { fontSize: 11, color: themeColors.text }
          },
          grid: { top: 30, left: 10, right: 10, bottom: 10, containLabel: true },
          xAxis: {
            type: 'value',
            axisLabel: {
              formatter: (val: number) => {
                const abs = Math.abs(val);
                return abs >= 1000 ? `R$ ${(abs / 1000).toFixed(0)}k` : `R$ ${abs}`;
              },
              fontSize: 9,
              color: themeColors.text
            },
            splitLine: { lineStyle: { color: themeColors.borderLight } }
          },
          yAxis: {
            type: 'category',
            data: butterflyCats,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { fontSize: 10, color: themeColors.text, width: 90, overflow: 'truncate' }
          },
          series: [
            {
              name: 'Comercial',
              type: 'bar',
              stack: 'total',
              itemStyle: { borderRadius: [4, 0, 0, 4] },
              data: comValues
            },
            {
              name: 'Marketing',
              type: 'bar',
              stack: 'total',
              itemStyle: { borderRadius: [0, 4, 4, 0] },
              data: mktValues
            }
          ]
        };

        // 6. Evolução Centro de Custo
        const evolSeries = dados.evolucaoCentroCusto.series.map((s: any, idx: number) => ({
          name: s.name,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2 },
          data: s.data,
          itemStyle: { color: colors[idx % colors.length] }
        }));

        this.chartAnaliticoEvolucaoLinha = {
          tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
              let res = `<strong>${params[0].name}</strong><br/>`;
              params.forEach((p: any) => {
                res += `${p.marker} ${p.seriesName}: ${p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br/>`;
              });
              return res;
            }
          },
          grid: { top: 30, left: 20, right: 20, bottom: 30, containLabel: true },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: dados.evolucaoCentroCusto.meses,
            axisLabel: { fontSize: 11, color: themeColors.text },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: themeColors.border } }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (val: number) => val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`,
              fontSize: 11,
              color: themeColors.text
            },
            splitLine: { lineStyle: { color: themeColors.borderLight } }
          },
          series: evolSeries
        };

        // 7. Barras horizontais centro de custo
        const ccNamesAsc = [...dados.centroCustoBarras].reverse().map((c: any) => c.name);
        const ccValuesAsc = [...dados.centroCustoBarras].reverse().map((c: any) => c.value);

        this.chartAnaliticoCentroCusto = {
          color: ['#6366f1'],
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
              const p = params[0];
              return `${p.name}<br/>Total: ${p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            }
          },
          grid: { top: 10, left: 10, right: 80, bottom: 10, containLabel: true },
          xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
          yAxis: {
            type: 'category',
            data: ccNamesAsc,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { fontSize: 10, color: themeColors.text, width: 180, overflow: 'truncate' }
          },
          series: [{
            name: 'Valor',
            type: 'bar',
            barWidth: '55%',
            itemStyle: { borderRadius: [0, 4, 4, 0], color: '#6366f1' },
            label: {
              show: true,
              position: 'right',
              formatter: (params: any) => params.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              fontSize: 10,
              color: themeColors.text
            },
            data: ccValuesAsc
          }]
        };

        // 8. Mapa
        const maxMapVal = Math.max(1000, ...dados.mapaData.map((d: any) => d.value));
        const totalGeral = dados.analiticoTotalDespesas || 1;
        const mapaDataFormatado = dados.mapaData.map((d: any) => ({
          ...d,
          pct: ((d.value / totalGeral) * 100).toFixed(1)
        }));

        this.chartAnaliticoMapa = {
          tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
              const pct = params.data?.pct || '0.0';
              return `${params.name}<br/>Total: ${(params.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br/>Participação: ${pct}%`;
            }
          },
          visualMap: {
            min: 0,
            max: maxMapVal,
            text: ['Alto', 'Baixo'],
            realtime: false,
            calculable: true,
            textStyle: { color: themeColors.text },
            inRange: { color: isDark ? ['#172554', '#3b82f6', '#60a5fa'] : ['#eff6ff', '#3b82f6', '#1e3a8a'] }
          },
          series: [{
            name: 'Despesas por Estado',
            type: 'map',
            map: 'brazil',
            roam: true,
            label: { show: false },
            data: mapaDataFormatado
          }]
        };

        // 9-11. Outros paineis
        this.rankingColaboradores = dados.rankingColaboradores;
        this.rankingCategorias = dados.rankingCategorias;
        this.detalhesMatrizOriginal = dados.detalhesMatrizOriginal;
        this.detalhesCategoriasColunas = dados.detalhesCategoriasColunas;
        this.detalhesTotaisPorCategoria = dados.detalhesTotaisPorCategoria;
        this.detalhesTotalGeral = dados.detalhesTotalGeral;

        // Atribuir detalhes lista
        this.analiticoDetalhes = dados.detalhes;

        this.filtrarDetalhesMatriz();
      },
      error: (err) => {
        console.error("Erro ao carregar dados analíticos", err);
        this.isAnaliticoLoading = false;
      }
    });
  }

  // ==========================================
  // ABA RELATÓRIO — GRID E FILTROS
  // ==========================================

  // Filtros Relatório
  relatorioDataInicio: Date | null = null;
  relatorioDataFim: Date | null = null;
  relatorioPeriodShortcut: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado' | 'personalizado' | null = 'este-ano';
  relatorioEmpresa: number | null = null;
  relatorioColaborador: number | null = null;
  relatorioCentroCusto: string | null = null;

  isRelatorioLoading = false;
  relatorioDetalhesMatrizOriginal: any[] = [];
  relatorioDetalhesMatrizFiltrada: any[] = [];
  relatorioDetalhesCategoriasColunas: string[] = [];
  relatorioDetalhesTotaisPorCategoria: { [cat: string]: number } = {};
  relatorioDetalhesTotalGeral = 0;
  searchRelatorioTerm = '';

  onSearchRelatorioChange(term: string) {
    this.searchRelatorioTerm = term;
    this.filtrarRelatorioDetalhesMatriz();
  }

  filtrarRelatorioDetalhesMatriz() {
    if (!this.searchRelatorioTerm || !this.searchRelatorioTerm.trim()) {
      this.relatorioDetalhesMatrizFiltrada = [...this.relatorioDetalhesMatrizOriginal];
      return;
    }
    const term = this.searchRelatorioTerm.toLowerCase().trim();
    this.relatorioDetalhesMatrizFiltrada = this.relatorioDetalhesMatrizOriginal.filter(item =>
      item.colaboradorNome.toLowerCase().includes(term) ||
      (item.empresaNome && item.empresaNome.toLowerCase().includes(term)) ||
      item.total.toString().includes(term)
    );
  }

  onRelatorioDataInicioChange() {
    if (this.relatorioDataInicio && this.relatorioDataFim && this.relatorioDataInicio > this.relatorioDataFim) {
      this.relatorioDataFim = this.relatorioDataInicio;
    }
    this.relatorioPeriodShortcut = 'personalizado';
    this.atualizarDadosRelatorio();
  }

  onRelatorioDataFimChange() {
    this.relatorioPeriodShortcut = 'personalizado';
    this.atualizarDadosRelatorio();
  }

  onRelatorioShortcutSelectChange(val: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado' | 'personalizado') {
    if (val !== 'personalizado') {
      this.selecionarAtalhoPeriodoRelatorio(val);
    }
  }

  selecionarAtalhoPeriodoRelatorio(shortcut: 'ultimo-bimestre' | 'ultimo-semestre' | 'este-ano' | 'ano-passado') {
    const today = new Date();
    const getPastDate = (months: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - months);
      return d;
    };

    switch (shortcut) {
      case 'ultimo-bimestre':
        this.relatorioDataInicio = getPastDate(2);
        this.relatorioDataFim = today;
        break;
      case 'ultimo-semestre':
        this.relatorioDataInicio = getPastDate(6);
        this.relatorioDataFim = today;
        break;
      case 'este-ano':
        this.relatorioDataInicio = new Date(today.getFullYear(), 0, 1);
        this.relatorioDataFim = new Date(today.getFullYear(), 11, 31);
        break;
      case 'ano-passado':
        this.relatorioDataInicio = new Date(today.getFullYear() - 1, 0, 1);
        this.relatorioDataFim = new Date(today.getFullYear() - 1, 11, 31);
        break;
    }
    this.relatorioPeriodShortcut = shortcut;
    this.atualizarDadosRelatorio();
  }

  atualizarDadosRelatorio() {
    this.isRelatorioLoading = true;
    const filtros = {
      data_inicio: this.relatorioDataInicio ? this.relatorioDataInicio.toISOString().split('T')[0] : null,
      data_fim: this.relatorioDataFim ? this.relatorioDataFim.toISOString().split('T')[0] : null,
      id_empresa: this.relatorioEmpresa || null,
      id_colaborador: this.relatorioColaborador || null,
      id_categoria: null
    };

    this.importacoesService.obterDadosDashboardAnalitico(filtros).subscribe({
      next: (dados) => {
        this.isRelatorioLoading = false;
        
        let matriz = dados.detalhesMatrizOriginal || [];
        
        // Filtro local de Centro de Custo na matriz
        if (this.relatorioCentroCusto) {
          const colabCCMap = new Map<string, string>();
          (dados.detalhes || []).forEach((item: any) => {
            if (item.colaboradorNome && item.centroCustoNome) {
              colabCCMap.set(item.colaboradorNome, item.centroCustoNome);
            }
          });
          matriz = matriz.filter((row: any) => colabCCMap.get(row.colaboradorNome) === this.relatorioCentroCusto);
        }

        this.relatorioDetalhesMatrizOriginal = matriz;
        this.relatorioDetalhesCategoriasColunas = dados.detalhesCategoriasColunas || [];
        
        // Recalcular totais se houver filtro local de centro de custo
        if (this.relatorioCentroCusto) {
          const totais: { [cat: string]: number } = {};
          let totalGeral = 0;
          this.relatorioDetalhesCategoriasColunas.forEach(cat => {
            totais[cat] = 0;
          });
          
          matriz.forEach((row: any) => {
            totalGeral += row.total;
            this.relatorioDetalhesCategoriasColunas.forEach(cat => {
              totais[cat] += (row.valoresPorCategoria[cat] || 0);
            });
          });
          
          this.relatorioDetalhesTotaisPorCategoria = totais;
          this.relatorioDetalhesTotalGeral = totalGeral;
        } else {
          this.relatorioDetalhesTotaisPorCategoria = dados.detalhesTotaisPorCategoria || {};
          this.relatorioDetalhesTotalGeral = dados.detalhesTotalGeral || 0;
        }

        this.filtrarRelatorioDetalhesMatriz();
      },
      error: (err) => {
        console.error("Erro ao carregar dados do relatório", err);
        this.isRelatorioLoading = false;
      }
    });
  }

}
