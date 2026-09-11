import { describe, expect, it } from 'vitest';
import { calcDre } from './losses';
import type { Loss } from '../types';

const loss = (l: Partial<Loss> & Pick<Loss, 'id'>): Loss => ({
  companyId: 'c1',
  kind: 'retrabalho',
  description: 'teste',
  value: 100,
  date: '2026-09-05',
  status: 'aberta',
  createdBy: 'u1',
  createdAt: '2026-09-05',
  ...l,
});

describe('calcDre', () => {
  it('separa receita, gasto e perda e calcula lucro real', () => {
    const dre = calcDre({
      orders: [{ status: 'concluido', date: '2026-09-01', value: 1000 }],
      expenses: [{ value: 200, date: '2026-09-02' }],
      losses: [loss({ id: '1', value: 150 })],
      monthKey: '2026-09',
    });
    expect(dre.revenue).toBe(1000);
    expect(dre.expenses).toBe(200);
    expect(dre.lossesOpen).toBe(150);
    expect(dre.netReal).toBe(650);
    expect(dre.netIfZeroLoss).toBe(800);
    expect(dre.leakPct).toBeCloseTo(15, 5);
  });

  it('recuperada abate o vazamento', () => {
    const dre = calcDre({
      orders: [{ status: 'concluido', date: '2026-09-01', value: 1000 }],
      expenses: [],
      losses: [loss({ id: '1', value: 150, status: 'recuperada' })],
      monthKey: '2026-09',
    });
    expect(dre.recovered).toBe(150);
    expect(dre.netReal).toBe(1000);
  });

  it('agrupa por tipo e responsável', () => {
    const dre = calcDre({
      orders: [],
      expenses: [],
      losses: [
        loss({ id: '1', kind: 'retrabalho', technician: 'Ana', value: 100 }),
        loss({ id: '2', kind: 'desconto', technician: 'Ana', value: 50 }),
      ],
      monthKey: '2026-09',
    });
    expect(dre.byKind[0].kind).toBe('retrabalho');
    expect(dre.byTech[0]).toMatchObject({ name: 'Ana', total: 150, count: 2 });
  });
});
