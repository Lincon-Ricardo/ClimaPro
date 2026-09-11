import type { Loss, LossKind, LossStatus } from '../types';

export const LOSS_KINDS: { key: LossKind; label: string; emoji: string; hint: string }[] = [
  { key: 'retrabalho', label: 'Retrabalho', emoji: '🔧', hint: 'Voltou porque a 1ª vez não resolveu' },
  { key: 'desconto', label: 'Desconto indevido', emoji: '🏷️', hint: 'Baixou o preço sem margem' },
  { key: 'cancelamento', label: 'Cancelamento tardio', emoji: '🚫', hint: 'Cliente cancelou com custo já gasto' },
  { key: 'peca_quebrada', label: 'Peça quebrada/extraviada', emoji: '🧩', hint: 'Quebrou, perdeu ou danificou em campo' },
  { key: 'deslocamento', label: 'Deslocamento perdido', emoji: '⛽', hint: 'Foi até lá e não executou' },
  { key: 'inadimplencia', label: 'Inadimplência', emoji: '⌛', hint: 'Executou e não recebeu' },
  { key: 'outro', label: 'Outro', emoji: '📦', hint: 'Qualquer valor que evaporou' },
];

export const LOSS_STATUS: { key: LossStatus; label: string }[] = [
  { key: 'aberta', label: 'Em aberto' },
  { key: 'absorvida', label: 'Absorvida' },
  { key: 'descontada', label: 'Descontada do técnico' },
  { key: 'cobrada', label: 'Cobrada do cliente' },
  { key: 'recuperada', label: 'Recuperada' },
  { key: 'cancelada', label: 'Cancelada' },
];

export function lossKindLabel(k?: string): string {
  return LOSS_KINDS.find((x) => x.key === k)?.label || 'Perda';
}

export function lossKindEmoji(k?: string): string {
  return LOSS_KINDS.find((x) => x.key === k)?.emoji || '📦';
}

export function lossStatusLabel(s?: string): string {
  return LOSS_STATUS.find((x) => x.key === s)?.label || s || '—';
}

const num = (v: unknown): number => Number(v) || 0;

export interface Dre {
  revenue: number;
  expenses: number;
  lossesOpen: number;
  lossesResolved: number;
  recovered: number;
  netReal: number;
  netIfZeroLoss: number;
  leakPct: number;
  byKind: { kind: LossKind; label: string; emoji: string; total: number; count: number }[];
  byTech: { name: string; total: number; count: number }[];
  byStatus: { status: LossStatus; label: string; total: number; count: number }[];
}

export function calcDre(opts: {
  orders: { status?: string; paymentStatus?: string; value?: unknown; date?: string }[];
  expenses: { value?: unknown; date?: string }[];
  losses: Loss[];
  monthKey: string;
}): Dre {
  const inMonth = (d?: string) => (d || '').startsWith(opts.monthKey);
  const revenue = opts.orders
    .filter((o) => o.status === 'concluido' && inMonth(o.date))
    .reduce((s, o) => s + num(o.value), 0);
  const expenses = opts.expenses
    .filter((e) => inMonth(e.date))
    .reduce((s, e) => s + num(e.value), 0);
  const month = opts.losses.filter((l) => inMonth(l.date));
  const lossesOpen = month.filter((l) => l.status === 'aberta').reduce((s, l) => s + num(l.value), 0);
  const recovered = month.filter((l) => l.status === 'recuperada').reduce((s, l) => s + num(l.value), 0);
  const lossesResolved = month.filter((l) => l.status !== 'aberta' && l.status !== 'cancelada').reduce((s, l) => s + num(l.value), 0);
  const netReal = revenue - expenses - lossesOpen - lossesResolved + recovered;
  const netIfZeroLoss = revenue - expenses;
  const leakPct = revenue > 0 ? Math.min(100, ((lossesOpen + lossesResolved - recovered) / revenue) * 100) : 0;

  const byKind = LOSS_KINDS.map((k) => {
    const rows = month.filter((l) => l.kind === k.key && l.status !== 'cancelada');
    return { kind: k.key, label: k.label, emoji: k.emoji, total: rows.reduce((s, l) => s + num(l.value), 0), count: rows.length };
  })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  const techMap = new Map<string, { total: number; count: number }>();
  month.filter((l) => l.status !== 'cancelada').forEach((l) => {
    const name = (l.technician || 'Sem técnico').trim() || 'Sem técnico';
    const e = techMap.get(name) || { total: 0, count: 0 };
    e.total += num(l.value);
    e.count += 1;
    techMap.set(name, e);
  });
  const byTech = Array.from(techMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);

  const byStatus = LOSS_STATUS.map((s) => {
    const rows = month.filter((l) => l.status === s.key);
    return { status: s.key, label: s.label, total: rows.reduce((x, l) => x + num(l.value), 0), count: rows.length };
  });

  return { revenue, expenses, lossesOpen, lossesResolved, recovered, netReal, netIfZeroLoss, leakPct, byKind, byTech, byStatus };
}

export function lossWhatsText(opts: { description: string; value: number; osNumber?: string; company?: string }): string {
  const v = Number(opts.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return `Olá! Aqui é da ${opts.company || 'nossa empresa'}. Identificamos um custo extra de ${v} referente a "${opts.description}"${opts.osNumber ? ` (OS ${opts.osNumber})` : ''}. Podemos acertar hoje? ❄️`;
}
