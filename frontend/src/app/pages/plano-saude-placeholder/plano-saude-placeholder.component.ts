import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-plano-saude-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule, CardComponent, ButtonComponent],
  template: `
    <div class="placeholder-container">
      <app-card [padding]="true" class="placeholder-card">
        <div class="content">
          <div class="icon-wrap">
            <i class="fa-solid fa-person-digging"></i>
          </div>
          <h1>Plano de Saúde</h1>
          <p>Este módulo está sendo preparado e em breve estará disponível para acesso.</p>
          
          <app-button variant="primary" routerLink="/home">
            Voltar para Home
          </app-button>
        </div>
      </app-card>
    </div>
  `,
  styles: [`
    @import 'styles/variables';
    
    .placeholder-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 50vh;
      padding: 2rem;
    }

    .placeholder-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;

      .icon-wrap {
        width: 80px;
        height: 80px;
        background-color: rgba($primary, 0.1);
        color: $primary;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        margin-bottom: 1.5rem;
      }

      h1 {
        font-size: 1.5rem;
        font-weight: $font-weight-bold;
        color: $gray-900;
        margin-bottom: 0.75rem;
      }

      p {
        font-size: 1rem;
        color: $gray-500;
        margin-bottom: 2rem;
        line-height: 1.5;
      }
    }
  `]
})
export class PlanoSaudePlaceholderComponent {}
