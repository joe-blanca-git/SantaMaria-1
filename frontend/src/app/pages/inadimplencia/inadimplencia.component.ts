import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PendenciasComponent } from './components/pages/pendencias/pendencias.component';

@Component({
  selector: 'app-inadimplencia',
  standalone: true,
  imports: [CommonModule, PendenciasComponent],
  templateUrl: './inadimplencia.component.html',
  styleUrls: ['./inadimplencia.component.scss']
})
export class InadimplenciaComponent implements OnInit {
  isSidebarCollapsed = false;
  activeTab = 'pendencias';

  ngOnInit() {
    this.isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.isSidebarCollapsed));
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
