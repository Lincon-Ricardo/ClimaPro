import { db } from '../lib/db';
import { toggleChecklistItem, todayISO, normalizePaymentMethod } from '../lib/utils';
import type { ChecklistItem, ServiceOrder } from '../types';

export function useServiceOrderActions(order: ServiceOrder | undefined) {
  async function setField(changes: Partial<ServiceOrder>) {
    if (!order) return;
    await db.serviceOrders.update(order.id, changes);
  }

  async function setStatus(status: ServiceOrder['status']) {
    await setField({ status });
  }

  async function toggleItem(it: ChecklistItem) {
    if (!order) return;
    const list = order.checklist ? toggleChecklistItem(order.checklist, it.id) : [];
    await setField({ checklist: list });
  }

  async function saveSignature(dataUrl: string) {
    await setField({ customerSignature: dataUrl, signatureDate: todayISO() });
  }

  async function markPaid(paymentMethod: string) {
    if (!order) return;
    const method = normalizePaymentMethod(paymentMethod) as ServiceOrder['paymentMethod'];
    await setField({ paymentStatus: 'pago', paymentMethod: method });
    const payment = await db.payments.where('serviceOrderId').equals(order.id).first();
    const changes = {
      customerId: order.customerId,
      value: Number(order.value) || 0,
      method,
      status: 'pago' as const,
      paidAt: todayISO(),
      createdAt: payment?.createdAt || new Date().toISOString(),
    };
    if (payment) {
      await db.payments.update(payment.id, changes);
    } else {
      await db.payments.add({ id: crypto.randomUUID(), serviceOrderId: order.id, ...changes });
    }
  }

  return { setField, setStatus, toggleItem, saveSignature, markPaid };
}
