import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold text-neutral-800 dark:text-neutral-100">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-white px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-800">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-700/60 dark:text-neutral-500">
        {icon}
      </div>
      <h3 className="text-base font-bold text-neutral-700 dark:text-neutral-200">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-neutral-400 dark:text-neutral-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
