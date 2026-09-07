import type { ReactNode } from 'react';

export function Page({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto w-full min-w-0 ${narrow ? 'max-w-3xl' : 'max-w-6xl'}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="break-words text-lg font-extrabold leading-tight text-neutral-800 dark:text-neutral-100 sm:text-xl">{title}</h1>
        {subtitle && <p className="mt-0.5 break-words text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">{subtitle}</p>}
      </div>
      {action && <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">{action}</div>}
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
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-700/60 dark:text-neutral-400">
        {icon}
      </div>
      <h3 className="text-base font-bold text-neutral-700 dark:text-neutral-200">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-neutral-400 dark:text-neutral-400">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
