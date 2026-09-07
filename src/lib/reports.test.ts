import { describe, expect, it } from 'vitest';
import { calcKpi, calcTeam, filterOrdersByPeriod, parseMetaInput, rangeBounds } from './reports';
import type { Budget, ServiceOrder } from '../types';

const order = (o: Partial<ServiceOrder>): ServiceOrder => ({
  id: '1', osNumber: 'OS-1', customerId: 'c1', problem: '', service: 'Limpeza',
  value: 100, date: '2026-09-01', time: '', address: '', technician: 'Ana',
  status: 'concluido', checklist: [], fotosAntes: [], fotosDurante: [], fotosDepois: [],
  observacoesTecnicas: '', paymentStatus: 'pago', createdAt: '2026-09-01',
  ...o,
});

describe('reports', () => {
  it('rangeBounds mes cobre do dia 1 ate hoje', () => {
    const { from, to } = rangeBounds('mes');
    expect(from.endsWith('-01')).toBe(true);
    expect(from <= to).toBe(true);
  });

  it('filterOrdersByPeriod respeita intervalo', () => {
    const list = [order({ date: '2026-09-01' }), order({ date: '2026-08-01' })];
    expect(filterOrdersByPeriod(list, '2026-09-01', '2026-09-30')).toHaveLength(1);
  });

  it('calcKpi soma receita e ignora cancelado', () => {
    const kpi = calcKpi(
      [order({ value: 100 }), order({ value: 50, status: 'cancelado' }), order({ value: 200, status: 'agendado' })],
      [] as Budget[],
    );
    expect(kpi.revenue).toBe(100);
    expect(kpi.cancelRate).toBeCloseTo(33.3, 1);
  });

  it('calcTeam agrega por tecnico', () => {
    const team = calcTeam([order({ technician: 'Ana' }), order({ technician: 'Ana', status: 'agendado' })], '2026-09-01');
    expect(team[0].done).toBe(1);
    expect(team[0].open).toBe(1);
    expect(team[0].efficiency).toBe(50);
  });

  it('parseMetaInput rejeita zero e texto', () => {
    expect(parseMetaInput('0')).toBeNull();
    expect(parseMetaInput('abc')).toBeNull();
    expect(parseMetaInput('30.000,00')).toBe(30000);
  });
});
