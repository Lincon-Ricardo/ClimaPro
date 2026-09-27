import { beforeEach, describe, expect, it } from 'vitest';
import { checkoutError } from './billingErrors';

describe('checkoutError', () => {
  it('mapeia NOT_ADMIN para ação owner', () => {
    expect(checkoutError('NOT_ADMIN', 'x').action).toBe('owner');
  });
  it('mapeia INVALID_DOC para ação empresa', () => {
    const r = checkoutError('INVALID_DOC', 'x');
    expect(r.action).toBe('empresa');
    expect(r.text).toMatch(/CPF\/CNPJ/);
  });
  it('código desconhecido usa fallback com retry', () => {
    const r = checkoutError('XPTO', 'falhou');
    expect(r).toEqual({ text: 'falhou', action: 'retry' });
  });
  it('sem código usa fallback com retry', () => {
    expect(checkoutError(undefined, 'ops')).toEqual({ text: 'ops', action: 'retry' });
  });
});

describe('loadPendingCheckout', () => {
  beforeEach(() => localStorage.clear());
  it('retorna null quando vazio', async () => {
    const { loadPendingCheckout } = await import('./billingErrors');
    expect(loadPendingCheckout()).toBeNull();
  });
  it('descarta pendência com mais de 7 dias', async () => {
    const { savePendingCheckout, loadPendingCheckout } = await import('./billingErrors');
    savePendingCheckout({
      subscriptionId: 'sub_1', planKey: 'pro', cycle: 'monthly',
      method: 'pix', checkoutUrl: null,
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    });
    expect(loadPendingCheckout()).toBeNull();
  });
});
