import type { ServiceStatus, ChecklistItem, BudgetItem } from '../types';

export function toggleChecklistItem(list: ChecklistItem[], id: string): ChecklistItem[] {
  return list.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
}

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  solicitacao: 'Solicitação recebida',
  orcamento_enviado: 'Orçamento enviado',
  aguardando_aprovacao: 'Aguardando aprovação',
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const STATUS_STYLE: Record<ServiceStatus, string> = {
  solicitacao: 'bg-yellow-100 text-yellow-800',
  orcamento_enviado: 'bg-blue-100 text-blue-800',
  aguardando_aprovacao: 'bg-orange-100 text-orange-800',
  agendado: 'bg-purple-100 text-purple-800',
  em_andamento: 'bg-sky-100 text-sky-800',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
};

export const STATUS_DOT: Record<ServiceStatus, string> = {
  solicitacao: 'bg-yellow-400',
  orcamento_enviado: 'bg-blue-500',
  aguardando_aprovacao: 'bg-orange-400',
  agendado: 'bg-purple-500',
  em_andamento: 'bg-sky-500',
  concluido: 'bg-green-500',
  cancelado: 'bg-red-500',
};

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function brlToNumber(v: string): number {
  const digits = onlyDigits(v);
  return digits ? parseInt(digits, 10) / 100 : 0;
}

export function numberToBRLInput(v: number): string {
  const cents = Math.round((v || 0) * 100);
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseMoney(v: string): number {
  const normalized = v.replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function budgetTotal(items: BudgetItem[], labor = 0, displacement = 0, discount = 0): number {
  const itemsTotal = items.reduce((s, i) => s + (i.qty || 0) * (i.unitValue || 0), 0);
  return itemsTotal + (labor || 0) + (displacement || 0) - (discount || 0);
}

export function itemTotal(item: Pick<BudgetItem, 'qty' | 'unitValue'>): number {
  return (item.qty || 0) * (item.unitValue || 0);
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateLong(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function todayISO(): string {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  d.setMonth(d.getMonth() + months);
  return toISODate(d);
}

export function uid(prefix = ''): string {
  return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

export function telToWhats(phone: string): string {
  return '55' + onlyDigits(phone);
}

export function formatPhone(phone: string): string {
  const d = onlyDigits(phone);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

export function greetings(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const SERVICE_TYPES = [
  'Instalação',
  'Manutenção preventiva',
  'Manutenção corretiva',
  'Higienização',
  'Limpeza',
  'Reparo',
  'Visita técnica',
  'Orçamento',
  'Gás / Carga',
];

export const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
];

export const EQUIPMENT_TYPES = [
  'Split Higien Wall',
  'Split Piso Teto',
  'Split Cassete',
  'Split Inverter',
  'Janela',
  'Multi Split',
  'VRF / VRV',
  'Self-Clean',
];
