import { describe, expect, it } from 'vitest';
import { matchesTech } from './useTechOrders';

describe('matchesTech', () => {
  it('casa exato e primeiro nome como token', () => {
    expect(matchesTech('Ana Souza', 'ana souza', 'ana')).toBe(true);
    expect(matchesTech('Ana', 'ana souza', 'ana')).toBe(true);
  });

  it('nao da falso positivo maria x mariana', () => {
    expect(matchesTech('Mariana', 'maria', 'maria')).toBe(false);
    expect(matchesTech('Maria', 'maria', 'maria')).toBe(true);
  });

  it('rejeita vazio', () => {
    expect(matchesTech('', 'ana', 'ana')).toBe(false);
  });
});
