import type { ReactNode } from 'react';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ${onClick ? 'cursor-pointer hover:border-primary-300 hover:shadow-md transition touch-manipulation dark:hover:border-primary-500' : ''} dark:border-neutral-700 dark:bg-neutral-800 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  color = 'text-primary-700 dark:text-primary-300',
  bg = 'bg-primary-50 dark:bg-primary-900/40',
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color?: string;
  bg?: string;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ${onClick ? 'cursor-pointer transition hover:border-primary-300 hover:shadow-md dark:hover:border-primary-500' : ''} dark:border-neutral-700 dark:bg-neutral-800`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>{icon}</div>
      <div className="min-w-0">
        <div className={`truncate text-xl font-bold leading-tight ${color}`}>{value}</div>
        <div className={`truncate text-xs ${onClick ? 'font-medium text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`}>{label}</div>
      </div>
    </div>
  );
}
