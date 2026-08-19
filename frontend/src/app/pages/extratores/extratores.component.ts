import { Component, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ImportacoesService } from '../../core/services/importacoes.service';

export interface ExtractorCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  colorClass: string;
  status: 'active' | 'upcoming' | 'maintenance';
  statusText: string;
  statusVariant: 'success' | 'warning' | 'info' | 'primary' | 'secondary' | 'error' | 'danger';
}

@Component({
  selector: 'app-extratores',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    ModalComponent,
    LoadingComponent
  ],
  templateUrl: './extratores.component.html',
  styleUrl: './extratores.component.scss'
})
export class ExtratoresComponent {
  private importacoesService = inject(ImportacoesService);

  @ViewChild('atacadaoFileInput') atacadaoFileInput!: ElementRef<HTMLInputElement>;

  // Estado de upload do Atacadão
  atacadaoFile = signal<File | null>(null);
  isSuccessModalOpen = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  processingError = signal<string>('');

  @ViewChild('sendasFileInput') sendasFileInput!: ElementRef<HTMLInputElement>;

  // Estado de upload do Sendas
  sendasFile = signal<File | null>(null);
  isSendasModalOpen = signal<boolean>(false);
  isSendasProcessing = signal<boolean>(false);
  sendasError = signal<string>('');

  @ViewChild('prorrogacaoHtmlInput') prorrogacaoHtmlInput!: ElementRef<HTMLInputElement>;
  @ViewChild('prorrogacaoExcelInput') prorrogacaoExcelInput!: ElementRef<HTMLInputElement>;

  // Estado de upload da Prorrogação
  prorrogacaoHtmlFile = signal<File | null>(null);
  prorrogacaoExcelFile = signal<File | null>(null);
  isProrrogacaoModalOpen = signal<boolean>(false);
  isProrrogacaoProcessing = signal<boolean>(false);
  prorrogacaoError = signal<string>('');

  @ViewChild('sendasProrrogacaoInput') sendasProrrogacaoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('acrProrrogacaoInput') acrProrrogacaoInput!: ElementRef<HTMLInputElement>;

  // Estado de upload da Prorrogação Sendas (Sendas + ACR)
  sendasProrrogacaoFile = signal<File | null>(null);
  acrProrrogacaoFile = signal<File | null>(null);
  isSendasProrrogacaoModalOpen = signal<boolean>(false);
  isSendasProrrogacaoProcessing = signal<boolean>(false);
  sendasProrrogacaoError = signal<string>('');

  @ViewChild('martminasProrrogacaoInput') martminasProrrogacaoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('acrMartminasProrrogacaoInput') acrMartminasProrrogacaoInput!: ElementRef<HTMLInputElement>;

  // Estado de upload da Prorrogação Mart Minas (Mart Minas + ACR)
  martminasProrrogacaoFile = signal<File | null>(null);
  acrMartminasProrrogacaoFile = signal<File | null>(null);
  isMartminasProrrogacaoModalOpen = signal<boolean>(false);
  isMartminasProrrogacaoProcessing = signal<boolean>(false);
  martminasProrrogacaoError = signal<string>('');

  @ViewChild('savegnagoProrrogacaoInput') savegnagoProrrogacaoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('acrSavegnagoProrrogacaoInput') acrSavegnagoProrrogacaoInput!: ElementRef<HTMLInputElement>;

  // Estado de upload da Prorrogação Savegnago (Savegnago + ACR)
  savegnagoProrrogacaoFile = signal<File | null>(null);
  acrSavegnagoProrrogacaoFile = signal<File | null>(null);
  isSavegnagoProrrogacaoModalOpen = signal<boolean>(false);
  isSavegnagoProrrogacaoProcessing = signal<boolean>(false);
  savegnagoProrrogacaoError = signal<string>('');
  // Lista de 5 cards iniciais de Extratores
  extractors = signal<ExtractorCard[]>([
    {
      id: 'ext-pdf-ia',
      name: 'Atacadão',
      description: 'Importação de dados da composição de pagamento',
      icon: 'fa-solid fa-wand-magic-sparkles',
      colorClass: 'text-primary bg-primary-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success'
    },
    {
      id: 'ext-ofx-pdf',
      name: 'Sendas',
      description: 'Importação de dados da composição de pagamento',
      icon: 'fa-solid fa-file-excel',
      colorClass: 'text-success bg-success-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success'
    },
    {
      id: 'ext-atacadao-prorrogacao',
      name: 'Atacadão',
      description: 'Importação de dados de prorrogação',
      icon: 'fa-solid fa-clock-rotate-left',
      colorClass: 'text-info bg-info-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success'
    },
    {
      id: 'ext-sendas-prorrogacao',
      name: 'Sendas',
      description: 'Importação de dados de prorrogação',
      icon: 'fa-solid fa-clock-rotate-left',
      colorClass: 'text-warning bg-warning-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success'
    },
    {
      id: 'ext-martminas-prorrogacao',
      name: 'Mart Minas',
      description: 'Importação de dados de prorrogação',
      icon: 'fa-solid fa-clock-rotate-left',
      colorClass: 'text-danger bg-danger-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success'
    },
    {
      id: 'ext-savegnago-prorrogacao',
      name: 'Savegnago',
      description: 'Importação de dados de prorrogação',
      icon: 'fa-solid fa-clock-rotate-left',
      colorClass: 'text-primary bg-primary-subtle',
      status: 'active',
      statusText: 'Ativo',
      statusVariant: 'success'
    }
  ]);

  triggerAtacadaoUpload() {
    if (this.atacadaoFileInput) {
      this.atacadaoFileInput.nativeElement.click();
    }
  }

  onAtacadaoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.atacadaoFile.set(input.files[0]);
      this.processingError.set('');
      this.isProcessing.set(false);
      this.isSuccessModalOpen.set(true);
    }
  }

  processAtacadaoFile() {
    const file = this.atacadaoFile();
    if (!file) return;

    this.isProcessing.set(true);
    this.processingError.set('');

    this.importacoesService.extrairAtacadao(file).subscribe({
      next: (blob) => {
        this.isProcessing.set(false);
        this.isSuccessModalOpen.set(false);

        // Download da planilha automaticamente
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || 'Atacadao';
        a.download = `${originalName}_extraido.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isProcessing.set(false);
        console.error(err);
        this.processingError.set('Erro ao processar o arquivo. Verifique se o arquivo HTML corresponde ao padrão esperado.');
      }
    });
  }

  triggerSendasUpload() {
    if (this.sendasFileInput) {
      this.sendasFileInput.nativeElement.click();
    }
  }

  onSendasFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.sendasFile.set(input.files[0]);
      this.sendasError.set('');
      this.isSendasProcessing.set(false);
      this.isSendasModalOpen.set(true);
    }
  }

  processSendasFile() {
    const file = this.sendasFile();
    if (!file) return;

    this.isSendasProcessing.set(true);
    this.sendasError.set('');

    this.importacoesService.extrairSendas(file).subscribe({
      next: (blob) => {
        this.isSendasProcessing.set(false);
        this.isSendasModalOpen.set(false);

        // Download da planilha automaticamente
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || 'Sendas';
        a.download = `${originalName}_extraido.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isSendasProcessing.set(false);
        console.error(err);
        this.sendasError.set('Erro ao processar a planilha. Verifique se as colunas H e X estão presentes e corretas.');
      }
    });
  }

  triggerProrrogacaoHtmlUpload() {
    if (this.prorrogacaoHtmlInput) {
      this.prorrogacaoHtmlInput.nativeElement.click();
    }
  }

  triggerProrrogacaoExcelUpload() {
    if (this.prorrogacaoExcelInput) {
      this.prorrogacaoExcelInput.nativeElement.click();
    }
  }

  onProrrogacaoHtmlSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.prorrogacaoHtmlFile.set(input.files[0]);
      this.prorrogacaoError.set('');
      this.isProrrogacaoProcessing.set(false);
      this.isProrrogacaoModalOpen.set(true);
    }
  }

  onProrrogacaoExcelSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.prorrogacaoExcelFile.set(input.files[0]);
      this.prorrogacaoError.set('');
      this.isProrrogacaoProcessing.set(false);
      this.isProrrogacaoModalOpen.set(true);
    }
  }

  processProrrogacaoFile() {
    const html = this.prorrogacaoHtmlFile();
    const csv = this.prorrogacaoExcelFile();
    if (!html || !csv) {
      this.prorrogacaoError.set('Por favor, selecione ambos os arquivos (HTML e CSV/Excel) antes de processar.');
      return;
    }

    this.isProrrogacaoProcessing.set(true);
    this.prorrogacaoError.set('');

    this.importacoesService.conciliarProrrogacaoAtacadao(html, csv).subscribe({
      next: (blob) => {
        this.isProrrogacaoProcessing.set(false);
        this.isProrrogacaoModalOpen.set(false);
        
        // Limpar arquivos após o sucesso
        this.prorrogacaoHtmlFile.set(null);
        this.prorrogacaoExcelFile.set(null);

        // Download da planilha automaticamente
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = html.name.substring(0, html.name.lastIndexOf('.')) || 'Conciliado';
        a.download = `${originalName}_conciliado.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isProrrogacaoProcessing.set(false);
        console.error(err);
        this.prorrogacaoError.set('Erro ao conciliar os arquivos. Verifique se o formato do HTML e do CSV está correto.');
      }
    });
  }

  triggerSendasProrrogacaoUpload() {
    if (this.sendasProrrogacaoInput) {
      this.sendasProrrogacaoInput.nativeElement.click();
    }
  }

  triggerAcrProrrogacaoUpload() {
    if (this.acrProrrogacaoInput) {
      this.acrProrrogacaoInput.nativeElement.click();
    }
  }

  onSendasProrrogacaoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.sendasProrrogacaoFile.set(input.files[0]);
      this.sendasProrrogacaoError.set('');
      this.isSendasProrrogacaoProcessing.set(false);
      this.isSendasProrrogacaoModalOpen.set(true);
    }
  }

  onAcrProrrogacaoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.acrProrrogacaoFile.set(input.files[0]);
      this.sendasProrrogacaoError.set('');
      this.isSendasProrrogacaoProcessing.set(false);
      this.isSendasProrrogacaoModalOpen.set(true);
    }
  }

  processSendasProrrogacao() {
    const sendas = this.sendasProrrogacaoFile();
    const acr = this.acrProrrogacaoFile();
    if (!sendas || !acr) {
      this.sendasProrrogacaoError.set('Por favor, selecione ambos os arquivos (Sendas e ACR) antes de processar.');
      return;
    }

    this.isSendasProrrogacaoProcessing.set(true);
    this.sendasProrrogacaoError.set('');

    this.importacoesService.conciliarProrrogacaoSendas(sendas, acr).subscribe({
      next: (blob) => {
        this.isSendasProrrogacaoProcessing.set(false);
        this.isSendasProrrogacaoModalOpen.set(false);
        
        // Limpar arquivos após o sucesso
        this.sendasProrrogacaoFile.set(null);
        this.acrProrrogacaoFile.set(null);

        // Download da planilha automaticamente
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = sendas.name.substring(0, sendas.name.lastIndexOf('.')) || 'Conciliado';
        a.download = `${originalName}_conciliado.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isSendasProrrogacaoProcessing.set(false);
        console.error(err);
        this.sendasProrrogacaoError.set('Erro ao conciliar os arquivos. Verifique se o formato das planilhas está correto.');
      }
    });
  }

  triggerMartminasProrrogacaoUpload() {
    if (this.martminasProrrogacaoInput) {
      this.martminasProrrogacaoInput.nativeElement.click();
    }
  }

  triggerAcrMartminasProrrogacaoUpload() {
    if (this.acrMartminasProrrogacaoInput) {
      this.acrMartminasProrrogacaoInput.nativeElement.click();
    }
  }

  onMartminasProrrogacaoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.martminasProrrogacaoFile.set(input.files[0]);
      this.martminasProrrogacaoError.set('');
      this.isMartminasProrrogacaoProcessing.set(false);
      this.isMartminasProrrogacaoModalOpen.set(true);
    }
  }

  onAcrMartminasProrrogacaoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.acrMartminasProrrogacaoFile.set(input.files[0]);
      this.martminasProrrogacaoError.set('');
      this.isMartminasProrrogacaoProcessing.set(false);
      this.isMartminasProrrogacaoModalOpen.set(true);
    }
  }

  processMartminasProrrogacao() {
    const martminas = this.martminasProrrogacaoFile();
    const acr = this.acrMartminasProrrogacaoFile();
    if (!martminas || !acr) {
      this.martminasProrrogacaoError.set('Por favor, selecione ambos os arquivos (Mart Minas e ACR) antes de processar.');
      return;
    }

    this.isMartminasProrrogacaoProcessing.set(true);
    this.martminasProrrogacaoError.set('');

    this.importacoesService.conciliarProrrogacaoMartminas(martminas, acr).subscribe({
      next: (blob) => {
        this.isMartminasProrrogacaoProcessing.set(false);
        this.isMartminasProrrogacaoModalOpen.set(false);
        
        // Limpar arquivos após o sucesso
        this.martminasProrrogacaoFile.set(null);
        this.acrMartminasProrrogacaoFile.set(null);

        // Download da planilha automaticamente
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = martminas.name.substring(0, martminas.name.lastIndexOf('.')) || 'Conciliado';
        a.download = `${originalName}_conciliado.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isMartminasProrrogacaoProcessing.set(false);
        console.error(err);
        this.martminasProrrogacaoError.set('Erro ao conciliar os arquivos. Verifique se o formato das planilhas está correto.');
      }
    });
  }

  triggerSavegnagoProrrogacaoUpload() {
    if (this.savegnagoProrrogacaoInput) {
      this.savegnagoProrrogacaoInput.nativeElement.click();
    }
  }

  triggerAcrSavegnagoProrrogacaoUpload() {
    if (this.acrSavegnagoProrrogacaoInput) {
      this.acrSavegnagoProrrogacaoInput.nativeElement.click();
    }
  }

  onSavegnagoProrrogacaoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.savegnagoProrrogacaoFile.set(input.files[0]);
      this.savegnagoProrrogacaoError.set('');
      this.isSavegnagoProrrogacaoProcessing.set(false);
      this.isSavegnagoProrrogacaoModalOpen.set(true);
    }
  }

  onAcrSavegnagoProrrogacaoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.acrSavegnagoProrrogacaoFile.set(input.files[0]);
      this.savegnagoProrrogacaoError.set('');
      this.isSavegnagoProrrogacaoProcessing.set(false);
      this.isSavegnagoProrrogacaoModalOpen.set(true);
    }
  }

  processSavegnagoProrrogacao() {
    const savegnago = this.savegnagoProrrogacaoFile();
    const acr = this.acrSavegnagoProrrogacaoFile();
    if (!savegnago || !acr) {
      this.savegnagoProrrogacaoError.set('Por favor, selecione ambos os arquivos (Savegnago e ACR) antes de processar.');
      return;
    }

    this.isSavegnagoProrrogacaoProcessing.set(true);
    this.savegnagoProrrogacaoError.set('');

    this.importacoesService.conciliarProrrogacaoSavegnago(savegnago, acr).subscribe({
      next: (blob) => {
        this.isSavegnagoProrrogacaoProcessing.set(false);
        this.isSavegnagoProrrogacaoModalOpen.set(false);
        
        // Limpar arquivos após o sucesso
        this.savegnagoProrrogacaoFile.set(null);
        this.acrSavegnagoProrrogacaoFile.set(null);

        // Download da planilha automaticamente
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = savegnago.name.substring(0, savegnago.name.lastIndexOf('.')) || 'Conciliado';
        a.download = `${originalName}_conciliado.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isSavegnagoProrrogacaoProcessing.set(false);
        console.error(err);
        this.savegnagoProrrogacaoError.set('Erro ao conciliar os arquivos. Verifique se o formato das planilhas está correto.');
      }
    });
  }
}
