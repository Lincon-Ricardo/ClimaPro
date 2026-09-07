import { describe, expect, it } from 'vitest';
import { asDateKey, budgetTotal, formatDate, onlyDigits, telToWhats } from './utils';

describe('utils', () => {
  it('asDateKey aceita ISO e timestamptz', () => {
    expect(asDateKey('2026-09-07')).toBe('2026-09-07');
    expect(asDateKey('2026-09-07T10:00:00Z')).toBe('2026-09-07');
    expect(asDateKey('')).toBe('');
  });

  it('formatDate nao quebra com timestamptz', () => {
    expect(formatDate('2026-09-07T03:00:00Z')).toBe('07/09/2026');
  });

  it('budgetTotal nao fica negativo', () => {
    expect(budgetTotal([{ id: '1', description: 'x', qty: 1, unitValue: 100, total: 100 }], 0, 0, 150)).toBe(0);
  });

  it('telToWhats normaliza para 55+ddd', () => {
    expect(telToWhats('(11) 99999-0000')).toBe('5511999990000');
    expect(onlyDigits(null)).toBe('');
  });
});
