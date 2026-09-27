export type CheckoutAction = 'empresa' | 'owner' | 'retry' | 'support' | 'invoices' | null;

const CODE_MAP: Record<string, { text: string; action: CheckoutAction }> = {
  SESSION: { text: 'Sua sessão expirou. Entre novamente e tente outra vez.', action: 'retry' },
  NOT_ADMIN: { text: 'Só o dono da conta pode assinar. Peça ao dono para concluir a compra.', action: 'owner' },
  INVALID_DOC: { text: 'CPF/CNPJ da empresa inválido. Corrija o cadastro da empresa e tente de novo.', action: 'empresa' },
  NO_COMPANY: { text: 'Empresa não encontrada. Complete o cadastro da empresa primeiro.', action: 'empresa' },
  LIFETIME: { text: 'Você já é Pioneiro Vitalício. Nada a pagar. 👑', action: null },
  SAME_PLAN: { text: 'Sua empresa já está neste plano. Escolha outro plano ou ciclo.', action: null },
  RATE_LIMIT: { text: 'Muitas tentativas seguidas. Aguarde 1 minuto e tente de novo.', action: 'retry' },
  ASAAS: { text: 'O Asaas recusou esta forma de pagamento. Tente PIX ou boleto.', action: 'retry' },
  MISSING_CONFIG: { text: 'Cobrança indisponível no momento. Fale com o suporte.', action: 'support' },
  NO_CHECKOUT: { text: 'Cobrança criada, mas o link não voltou. Veja em Minhas cobranças.', action: 'invoices' },
  CHECKOUT_FAILED: { text: 'Não foi possível iniciar o pagamento. Tente de novo.', action: 'retry' },
  INVOICES_FAILED: { text: 'Não foi possível listar as cobranças agora.', action: 'retry' },
};

export function checkoutError(code: string | undefined, fallback: string): { text: string; action: CheckoutAction } {
  if (!code) return { text: fallback, action: 'retry' };
  return CODE_MAP[code] || { text: fallback, action: 'retry' };
}

export interface PendingCheckout {
  subscriptionId: string;
  planKey: string;
  cycle: string;
  method: string;
  checkoutUrl: string | null;
  createdAt: string;
}

const PENDING_KEY = 'climapro-pending-checkout';

export function savePendingCheckout(p: PendingCheckout) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

export function loadPendingCheckout(): PendingCheckout | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingCheckout;
    if (!p || !p.subscriptionId) return null;
    // Expira em 7 dias para não assombrar a tela para sempre.
    if (Date.now() - new Date(p.createdAt).getTime() > 7 * 86400000) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* noop */ }
}

const STATUS_LABEL: Record<string, { label: string; tone: 'paid' | 'pending' | 'overdue' | 'other' }> = {
  CONFIRMED: { label: 'Confirmado', tone: 'paid' },
  RECEIVED: { label: 'Pago', tone: 'paid' },
  RECEIVED_IN_CASH: { label: 'Pago', tone: 'paid' },
  PENDING: { label: 'Aguardando pagamento', tone: 'pending' },
  AWAITING_RISK_ANALYSIS: { label: 'Em análise', tone: 'pending' },
  OVERDUE: { label: 'Vencida', tone: 'overdue' },
  REFUNDED: { label: 'Estornada', tone: 'other' },
  REFUND_REQUESTED: { label: 'Estorno pedido', tone: 'other' },
  CHARGEBACK_REQUESTED: { label: 'Chargeback', tone: 'overdue' },
  CHARGEBACK_DISPUTE: { label: 'Em disputa', tone: 'overdue' },
  ACTIVE: { label: 'Ativa', tone: 'paid' },
  INACTIVE: { label: 'Inativa', tone: 'other' },
};

export function invoiceStatus(status: string): { label: string; tone: 'paid' | 'pending' | 'overdue' | 'other' } {
  return STATUS_LABEL[String(status || '').toUpperCase()] || { label: String(status || '—'), tone: 'other' };
}
