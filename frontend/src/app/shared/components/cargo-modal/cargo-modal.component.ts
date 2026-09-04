import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent } from '../button/button.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { CargosColaboradoresService, CargoColaborador } from '../../../core/services/cargos-colaboradores.service';

@Component({
  selector: 'app-cargo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, ConfirmModalComponent],
  templateUrl: './cargo-modal.component.html',
  styleUrls: ['./cargo-modal.component.scss']
})
export class CargoModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() cargoSaved = new EventEmitter<CargoColaborador>();

  cargosService = inject(CargosColaboradoresService);

  listaCargos: CargoColaborador[] = [];
  novoCargo: CargoColaborador = { nome: '', descricao: '' };
  modalMode: 'create' | 'edit' = 'create';
  isSalvando = false;

  ngOnInit() {
    this.carregarCargos();
  }

  carregarCargos() {
    this.cargosService.listar(1, 100).subscribe({
      next: (res) => {
        const list = res.items || [];
        this.listaCargos = list.sort((a, b) => a.nome.localeCompare(b.nome));
      },
      error: (err) => console.error(err)
    });
  }

  salvarCargo() {
    this.isSalvando = true;
    if (this.modalMode === 'create') {
      this.cargosService.criar(this.novoCargo).subscribe({
        next: (cargoSalvo) => {
          this.isSalvando = false;
          this.cancelarEdicao();
          this.carregarCargos();
          this.cargoSaved.emit(cargoSalvo);
        },
        error: (err) => {
          console.error(err);
          this.isSalvando = false;
        }
      });
    } else {
      this.cargosService.atualizar(this.novoCargo.idCargoColaborador!, this.novoCargo).subscribe({
        next: (cargoSalvo) => {
          this.isSalvando = false;
          this.cancelarEdicao();
          this.carregarCargos();
          this.cargoSaved.emit(cargoSalvo);
        },
        error: (err) => {
          console.error(err);
          this.isSalvando = false;
        }
      });
    }
  }

  editarCargo(cargo: CargoColaborador) {
    this.modalMode = 'edit';
    this.novoCargo = { ...cargo };
  }

  cancelarEdicao() {
    this.modalMode = 'create';
    this.novoCargo = { nome: '', descricao: '' };
  }

  // ==========================================
  // CONFIRM MODAL (GENERIC)
  // ==========================================
  isConfirmModalOpen = false;
  confirmTitle = 'Confirmar Exclusão';
  confirmMessage = 'Tem certeza que deseja excluir este cargo? Caso existam colaboradores vinculados, você poderá ter problemas.';
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

  confirmarExclusao(id: number) {
    this.openConfirmModal(
      'Excluir Cargo',
      'Tem certeza que deseja excluir este cargo? Caso existam colaboradores vinculados, você poderá ter problemas.',
      () => {
        this.cargosService.excluir(id).subscribe({
          next: () => {
            this.closeConfirmModal();
            this.carregarCargos();
            if (this.novoCargo.idCargoColaborador === id) {
              this.cancelarEdicao();
            }
          },
          error: (err) => {
            console.error(err);
            this.isConfirmLoading = false;
          }
        });
      }
    );
  }

  fechar() {
    this.closed.emit();
  }
}
