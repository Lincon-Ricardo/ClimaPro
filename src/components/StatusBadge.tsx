import type { ServiceStatus } from '../types';
import { STATUS_DOT, STATUS_LABEL } from '../lib/utils';

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const dot = STATUS_DOT[status] || 'bg-neutral-400';
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-700/60 dark:text-neutral-200">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
