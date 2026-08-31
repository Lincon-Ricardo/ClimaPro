import type { ReactNode } from 'react';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ${onClick ? 'cursor-pointer hover:border-primary-300 hover:shadow-md transition' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  color = 'text-primary-700',
  bg = 'bg-primary-50',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color?: string;
  bg?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>{icon}</div>
      <div className="min-w-0">
        <div className={`text-xl font-bold leading-tight ${color}`}>{value}</div>
        <div className="text-xs text-neutral-500">{label}</div>
      </div>
    </div>
  );
}
