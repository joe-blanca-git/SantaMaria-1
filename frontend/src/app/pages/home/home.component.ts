import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';

import { ISessionService } from '../../core/interfaces/session.service';
import { IModulesService } from '../../core/interfaces/modules.service';

import { CardComponent } from '../../shared/components/card/card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    CardComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  sessionService = inject(ISessionService);
  private modulesService = inject(IModulesService);

  user = this.sessionService.currentUser;
  
  // Real-time clock
  currentDate = new Date();
  private timerId: any;

  // Signal dos módulos
  modules = toSignal(this.modulesService.getActiveModules());

  ngOnInit() {
    this.timerId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }
}
