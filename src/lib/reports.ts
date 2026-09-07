import type { Budget, Customer, ServiceOrder } from '../types';
import { toISODate, todayISO } from './utils';

export type RangeKey = 'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'tudo';

export function rangeBounds(range: RangeKey): { from: string; to: string; label: string } {
  const t = new Date();
  const today = todayISO();
  if (range === 'hoje') return { from: today, to: today, label: 'Hoje' };
  if (range === 'semana') {
    const s = new Date(t);
    s.setDate(s.getDate() - 6);
    return { from: toISODate(s), to: today, label: 'Últimos 7 dias' };
  }
  if (range === 'mes') {
    const s = new Date(t.getFullYear(), t.getMonth(), 1);
    return { from: toISODate(s), to: today, label: t.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  }
  if (range === 'trimestre') {
    const s = new Date(t.getFullYear(), t.getMonth() - 2, 1);
    return { from: toISODate(s), to: today, label: 'Últimos 3 meses' };
  }
  if (range === 'ano') {
    const s = new Date(t.getFullYear(), 0, 1);
    return { from: toISODate(s), to: today, label: `Ano de ${t.getFullYear()}` };
  }
  return { from: '0000-01-01', to: '9999-12-31', label: 'Todo o histórico' };
}

const num = (v: unknown): number => Number(v) || 0;

export function filterOrdersByPeriod(orders: ServiceOrder[], from: string, to: string): ServiceOrder[] {
  return orders.filter((o) => (o.date || '') >= from && (o.date || '') <= to);
}

export function filterBudgetsByPeriod(budgets: Budget[], from: string, to: string): Budget[] {
  return budgets.filter((b) => {
    const d = (b.createdAt || '').slice(0, 10);
    return !d || (d >= from && d <= to);
  });
}

export interface Kpi {
  valid: ServiceOrder[];
  done: ServiceOrder[];
  revenue: number;
  ticket: number;
  paid: number;
  pending: number;
  cancelled: number;
  cancelRate: number;
  totalBud: number;
  approved: number;
  conversion: number;
  pipelineValue: number;
  recurring: number;
  totalCusts: number;
}

export function calcKpi(periodOrders: ServiceOrder[], periodBudgets: Budget[]): Kpi {
  const valid = periodOrders.filter((o) => o.status !== 'cancelado');
  const done = valid.filter((o) => o.status === 'concluido');
  const revenue = done.reduce((s, o) => s + num(o.value), 0);
  const ticket = done.length > 0 ? revenue / done.length : 0;
  const paidDone = valid
    .filter((o) => o.paymentStatus === 'pago' && o.status === 'concluido')
    .reduce((s, o) => s + num(o.value), 0);
  const paid = valid.filter((o) => o.paymentStatus === 'pago').reduce((s, o) => s + num(o.value), 0);
  const pending = revenue - paidDone;
  const cancelled = periodOrders.filter((o) => o.status === 'cancelado').length;
  const cancelRate = periodOrders.length > 0 ? (cancelled / periodOrders.length) * 100 : 0;
  const totalBud = periodBudgets.length;
  const approvedList = periodBudgets.filter((b) => b.status === 'aprovado');
  const conversion = totalBud > 0 ? (approvedList.length / totalBud) * 100 : 0;
  const pipelineValue = periodBudgets
    .filter((b) => !['aprovado', 'recusado'].includes(b.status))
    .reduce((s, b) => s + num(b.total), 0);
  const custCount = new Map<string, number>();
  valid.forEach((o) => custCount.set(o.customerId, (custCount.get(o.customerId) || 0) + 1));
  const recurring = Array.from(custCount.values()).filter((n) => n > 1).length;
  return {
    valid, done, revenue, ticket, paid, pending, cancelled, cancelRate,
    totalBud, approved: approvedList.length, conversion, pipelineValue,
    recurring, totalCusts: custCount.size,
  };
}

export function revenueSeries(orders: ServiceOrder[], range: RangeKey): { label: string; value: number }[] {
  const pts: { label: string; value: number }[] = [];
  const now = new Date();
  if (range === 'ano' || range === 'tudo') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const v = orders
        .filter((o) => o.status === 'concluido' && (o.date || '').startsWith(key))
        .reduce((s, o) => s + num(o.value), 0);
      pts.push({ label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value: v });
    }
  } else {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * (range === 'hoje' ? 0 : range === 'semana' ? 1 : 4));
      const iso = toISODate(d);
      const v = orders
        .filter((o) => o.status === 'concluido' && (o.date || '') === iso)
        .reduce((s, o) => s + num(o.value), 0);
      pts.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: v });
    }
  }
  return pts;
}

export interface TechRank { name: string; done: number; revenue: number; open: number }

export function techRanking(periodOrders: ServiceOrder[]): TechRank[] {
  const map = new Map<string, TechRank>();
  periodOrders.filter((o) => o.status !== 'cancelado').forEach((o) => {
    const name = (o.technician || 'Sem técnico').trim() || 'Sem técnico';
    const e = map.get(name) || { name, done: 0, revenue: 0, open: 0 };
    if (o.status === 'concluido') {
      e.done += 1;
      e.revenue += num(o.value);
    } else {
      e.open += 1;
    }
    map.set(name, e);
  });
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface ServiceMixItem { name: string; count: number; revenue: number }

export function serviceMix(periodOrders: ServiceOrder[], limit = 8): ServiceMixItem[] {
  const map = new Map<string, { count: number; revenue: number }>();
  periodOrders.filter((o) => o.status === 'concluido').forEach((o) => {
    const name = (o.service || 'Serviço').trim() || 'Serviço';
    const e = map.get(name) || { count: 0, revenue: 0 };
    e.count += 1;
    e.revenue += num(o.value);
    map.set(name, e);
  });
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface Debtor { id: string; name: string; phone: string; total: number; count: number }

export function topDebtors(orders: ServiceOrder[], customers: Customer[], limit = 8): Debtor[] {
  const map = new Map<string, Debtor>();
  orders
    .filter((o) => o.paymentStatus !== 'pago' && o.status !== 'cancelado' && num(o.value) > 0)
    .forEach((o) => {
      const c = customers.find((x) => x.id === o.customerId);
      const e = map.get(o.customerId) || { id: o.customerId, name: c?.name || 'Cliente', phone: c?.whatsapp || c?.phone || '', total: 0, count: 0 };
      e.total += num(o.value);
      e.count += 1;
      map.set(o.customerId, e);
    });
  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, limit);
}

export function staleBudgets(periodBudgets: Budget[], limit = 6): Budget[] {
  return periodBudgets
    .filter((b) => !['aprovado', 'recusado'].includes(b.status))
    .sort((a, b) => num(b.total) - num(a.total))
    .slice(0, limit);
}

export interface AdminData {
  valid: ServiceOrder[];
  done: ServiceOrder[];
  monthDone: ServiceOrder[];
  revenueMonth: number;
  revenueTotal: number;
  toReceive: number;
  receivedMonth: number;
  open: ServiceOrder[];
  overdue: ServiceOrder[];
  todayList: ServiceOrder[];
  noTech: ServiceOrder[];
  noDate: ServiceOrder[];
  stale: Budget[];
  pipelineValue: number;
  approved: number;
  approvalRate: number;
  ticket: number;
  cancelRate: number;
  score: number;
}

export function calcAdminData(
  orders: ServiceOrder[],
  budgets: Budget[],
  monthKey: string,
  today: string,
): AdminData {
  const valid = orders.filter((o) => o.status !== 'cancelado');
  const done = valid.filter((o) => o.status === 'concluido');
  const monthDone = done.filter((o) => (o.date || '').startsWith(monthKey));
  const revenueMonth = monthDone.reduce((s, o) => s + num(o.value), 0);
  const revenueTotal = done.reduce((s, o) => s + num(o.value), 0);
  const toReceive = orders
    .filter((o) => o.paymentStatus !== 'pago' && o.status !== 'cancelado')
    .reduce((s, o) => s + num(o.value), 0);
  const receivedMonth = valid
    .filter((o) => o.paymentStatus === 'pago' && (o.date || '').startsWith(monthKey))
    .reduce((s, o) => s + num(o.value), 0);
  const open = valid.filter((o) => o.status !== 'concluido');
  const overdue = open.filter((o) => o.date && o.date < today);
  const todayList = valid.filter((o) => o.date === today);
  const noTech = open.filter((o) => !(o.technician || '').trim());
  const noDate = open.filter((o) => !o.date);
  const stale = budgets.filter((b) => !['aprovado', 'recusado'].includes(b.status));
  const pipelineValue = stale.reduce((s, b) => s + num(b.total), 0);
  const approved = budgets.filter((b) => b.status === 'aprovado').length;
  const approvalRate = budgets.length ? Math.round((approved / budgets.length) * 100) : 0;
  const ticket = done.length ? revenueTotal / done.length : 0;
  const cancelRate = orders.length ? (orders.filter((o) => o.status === 'cancelado').length / orders.length) * 100 : 0;
  let score = 100;
  score -= Math.min(30, overdue.length * 6);
  score -= Math.min(20, stale.length * 2);
  score -= Math.min(15, noTech.length * 5);
  score -= Math.min(15, cancelRate);
  if (toReceive > revenueTotal * 0.5 && revenueTotal > 0) score -= 10;
  score = Math.max(5, Math.round(score));
  return {
    valid, done, monthDone, revenueMonth, revenueTotal, toReceive, receivedMonth,
    open, overdue, todayList, noTech, noDate, stale, pipelineValue,
    approved, approvalRate, ticket, cancelRate, score,
  };
}

export interface Funnel { stages: { key: string; label: string }[]; counts: Record<string, number>; max: number }

export function calcFunnel(orders: ServiceOrder[], budgets: Budget[]): Funnel {
  const stages = [
    { key: 'solicitacao', label: 'Solicitado' },
    { key: 'orcamento', label: 'Orçado' },
    { key: 'agendado', label: 'Agendado' },
    { key: 'em_andamento', label: 'Executando' },
    { key: 'concluido', label: 'Concluído' },
    { key: 'pago', label: 'Pago' },
  ];
  const counts: Record<string, number> = {
    solicitacao: orders.filter((o) => o.status === 'solicitacao').length,
    orcamento: orders.filter((o) => ['orcamento_enviado', 'aguardando_aprovacao'].includes(o.status)).length + budgets.filter((b) => !['aprovado', 'recusado'].includes(b.status)).length,
    agendado: orders.filter((o) => o.status === 'agendado').length,
    em_andamento: orders.filter((o) => o.status === 'em_andamento').length,
    concluido: orders.filter((o) => o.status === 'concluido').length,
    pago: orders.filter((o) => o.paymentStatus === 'pago' && o.status !== 'cancelado').length,
  };
  const max = Math.max(1, ...stages.map((s) => counts[s.key] || 0));
  return { stages, counts, max };
}

export interface TeamRow { name: string; open: number; done: number; revenue: number; today: number; total: number; efficiency: number; ticket: number }

export function calcTeam(orders: ServiceOrder[], today: string): TeamRow[] {
  const map = new Map<string, { name: string; open: number; done: number; revenue: number; today: number }>();
  orders.filter((o) => o.status !== 'cancelado').forEach((o) => {
    const name = (o.technician || 'Sem técnico').trim() || 'Sem técnico';
    const e = map.get(name) || { name, open: 0, done: 0, revenue: 0, today: 0 };
    if (o.status === 'concluido') {
      e.done += 1;
      e.revenue += num(o.value);
    } else {
      e.open += 1;
    }
    if (o.date === today && o.status !== 'concluido') e.today += 1;
    map.set(name, e);
  });
  return Array.from(map.values())
    .map((t) => ({
      ...t,
      total: t.done + t.open,
      efficiency: t.done + t.open > 0 ? Math.round((t.done / (t.done + t.open)) * 100) : 0,
      ticket: t.done > 0 ? t.revenue / t.done : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

const META_KEY = 'climapro_meta_mensal';

export function getMetaMensal(fallback = 30000): number {
  try {
    const v = Number(localStorage.getItem(META_KEY) || fallback);
    return Number.isNaN(v) || v <= 0 ? fallback : v;
  } catch {
    return fallback;
  }
}

export function setMetaMensal(v: number): void {
  localStorage.setItem(META_KEY, String(v));
}

export function parseMetaInput(raw: string): number | null {
  const clean = String(raw).replace(/[^\d.,]/g, '');
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const v = Number(normalized);
  return !Number.isFinite(v) || v <= 0 ? null : v;
}
