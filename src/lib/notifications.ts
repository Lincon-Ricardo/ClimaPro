import { db } from './db';
import type { Notification } from '../types';
import { addMonths, formatDate, toISODate, todayISO } from './utils';

let generating = false;

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
}

async function pushNotification(notif: Notification): Promise<void> {
  const existing = await db.notifications.get(notif.id);
  if (existing) return;
  await db.notifications.add(notif);
}

export async function generateNotifications(): Promise<void> {
  if (generating) return;
  try {
    const last = Number(localStorage.getItem('climapro-notif-last') || 0);
    if (Date.now() - last < 6 * 3600 * 1000) return;
  } catch { /* noop */ }
  generating = true;
  try {
    const orders = await db.serviceOrders.list({ pageSize: 200, columns: 'id,os_number,service,time,date,status,payment_status,reminder_months' }).then((r) => r.rows);
    const budgets = await db.budgets.list({ pageSize: 100, columns: 'id,number,service_type,status' }).then((r) => r.rows);

    // Serviço agendado para amanhã
    const tomorrow = tomorrowISO();
    for (const o of orders) {
      if (o.date === tomorrow && (o.status === 'agendado' || o.status === 'em_andamento')) {
        await pushNotification({
          id: `svc-${o.id}`,
          title: 'Serviço amanhã',
          message: `${o.service} · ${o.time || ''} · OS ${o.osNumber}`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    }

    // Orçamentos aprovados recentemente
    for (const b of budgets) {
      if (b.status === 'aprovado') {
        await pushNotification({
          id: `orc-${b.id}`,
          title: 'Orçamento aprovado',
          message: `Orçamento #${b.number} (${b.serviceType}) foi aprovado. Agende o serviço.`,
          type: 'success',
          read: false,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    }

    // Manutenção recomendada (a partir de ordens concluídas com lembrete vencido)
    for (const o of orders) {
      if (o.status === 'concluido' && o.reminderMonths) {
        const due = addMonths(o.date, o.reminderMonths);
        if (due <= todayISO()) {
          await pushNotification({
            id: `rem-${o.id}`,
            title: 'Manutenção recomendada',
            message: `Está na hora de contactar o cliente da OS ${o.osNumber} (vencida em ${formatDate(due)}).`,
            type: 'warning',
            read: false,
            createdAt: new Date().toISOString().slice(0, 10),
          });
        }
      }
    }

    // Pagamentos pendentes
    const concludedPending = orders.filter((o) => o.status === 'concluido' && o.paymentStatus !== 'pago');
    for (const o of concludedPending) {
      await pushNotification({
        id: `pay-${o.id}`,
        title: 'Pagamento pendente',
        message: `OS ${o.osNumber} concluída ainda não foi paga.`,
        type: 'danger',
        read: false,
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }
    try { localStorage.setItem('climapro-notif-last', String(Date.now())); } catch { /* noop */ }
  } finally {
    generating = false;
  }
}
