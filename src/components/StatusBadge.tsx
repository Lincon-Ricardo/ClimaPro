import type { ServiceStatus } from '../types';
import { STATUS_DOT, STATUS_LABEL } from '../lib/utils';

const TONE: Record<string, string> = {
  solicitacao: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100',
  orcamento_enviado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100',
  aguardando_aprovacao: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-100',
  agendado: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100',
  em_andamento: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100',
  concluido: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100',
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const dot = STATUS_DOT[status] || 'bg-neutral-400';
  const tone = TONE[status] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';
  return (
    <span className={`inline-flex max-w-full shrink-0 items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tone}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{STATUS_LABEL[status]}</span>
    </span>
  );
}
