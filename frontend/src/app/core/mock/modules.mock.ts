import { AppModule } from '../models/module.model';

export const MOCK_MODULES: AppModule[] = [
  {
    id: 'mod-health',
    name: 'Plano de Saúde',
    icon: 'fa-solid fa-heart-pulse',
    route: '/plano-saude',
    description: 'Gerencie beneficiários, planos, atendimentos, autorizações e muito mais.',
    isActive: true
  },
  {
    id: 'mod-viagens',
    name: 'Despesas de Viagens',
    icon: 'fa-solid fa-plane-departure',
    route: '/despesas-viagens',
    description: 'Gerencie despesas, reembolsos e prestação de contas de viagens.',
    isActive: true
  }
];
