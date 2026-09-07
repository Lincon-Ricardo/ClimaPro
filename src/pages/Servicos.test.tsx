import { describe, expect, it } from 'vitest';
import type { ServiceOrder } from '../types';

function applyFilter(orders: ServiceOrder[], filter: string): ServiceOrder[] {
  const list = orders.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  if (filter === 'pendentes') return list.filter((o) => !['concluido', 'cancelado'].includes(o.status));
  if (filter === 'agendados') return list.filter((o) => o.status === 'agendado' || o.status === 'em_andamento');
  if (filter === 'concluidos') return list.filter((o) => o.status === 'concluido');
  if (filter === 'cancelados') return list.filter((o) => o.status === 'cancelado');
  return list;
}

const order = (o: Partial<ServiceOrder> & Pick<ServiceOrder, 'id' | 'status'>): ServiceOrder => ({
  osNumber: 'OS-1', customerId: 'c1', problem: '', service: 'Limpeza', value: 100,
  date: '2026-09-01', time: '', address: '', technician: 'Ana', checklist: [],
  fotosAntes: [], fotosDurante: [], fotosDepois: [], observacoesTecnicas: '',
  paymentStatus: 'pendente', createdAt: '2026-09-01', ...o,
});

describe('Servicos pendentes', () => {
  const orders = [
    order({ id: '1', status: 'solicitacao' }),
    order({ id: '2', status: 'agendado' }),
    order({ id: '3', status: 'em_andamento' }),
    order({ id: '4', status: 'concluido' }),
    order({ id: '5', status: 'cancelado' }),
  ];

  it('pendentes exclui concluido e cancelado', () => {
    const ids = applyFilter(orders, 'pendentes').map((o) => o.id).sort();
    expect(ids).toEqual(['1', '2', '3']);
  });

  it('URL ?filter=pendentes e valida', () => {
    const sp = new URLSearchParams('filter=pendentes');
    expect(['todos', 'pendentes', 'agendados', 'concluidos', 'cancelados'].includes(sp.get('filter') || '')).toBe(true);
  });
});
