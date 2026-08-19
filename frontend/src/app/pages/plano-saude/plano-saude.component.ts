import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

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
    CardComponent,
    ButtonComponent,
    ModalComponent,
    LoadingComponent,
    BadgeComponent
  ],
  templateUrl: './plano-saude.component.html',
  styleUrl: './plano-saude.component.scss'
})
export class PlanoSaudeComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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

  closeModal() {
    this.isUploadModalOpen.set(false);
    this.activeCard.set(null);
    this.selectedFile.set(null);
    this.processingStep.set(0);
  }
}
