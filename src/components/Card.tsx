import type { ReactNode } from 'react';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`cp-card cp-rise rounded-3xl p-4 sm:p-5 ${onClick ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(11,61,145,.45)] touch-manipulation' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

const STAT_THEMES: Record<string, { bg: string; color: string }> = {
  blue: { bg: 'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-[0_10px_24px_-10px_rgba(59,130,246,.7)]', color: 'text-neutral-900 dark:text-white' },
  emerald: { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_10px_24px_-10px_rgba(16,185,129,.7)]', color: 'text-neutral-900 dark:text-white' },
  amber: { bg: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_10px_24px_-10px_rgba(245,158,11,.7)]', color: 'text-neutral-900 dark:text-white' },
  violet: { bg: 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-[0_10px_24px_-10px_rgba(139,92,246,.7)]', color: 'text-neutral-900 dark:text-white' },
};

export function StatCard({
  icon,
  label,
  value,
  tone = 'blue',
  color,
  bg,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: keyof typeof STAT_THEMES;
  color?: string;
  bg?: string;
  onClick?: () => void;
}) {
  const theme = STAT_THEMES[tone];
  const iconCls = bg || theme.bg;
  const valueCls = color || theme.color;
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`cp-card flex min-w-0 items-center gap-3 overflow-hidden rounded-3xl p-3.5 sm:p-4 ${onClick ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5' : ''}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconCls}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className={`font-display break-words text-[17px] font-extrabold leading-tight sm:text-xl ${valueCls}`}>{value}</div>
        <div className={`mt-0.5 truncate text-[11px] font-semibold leading-snug sm:whitespace-normal sm:text-xs ${onClick ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'}`}>{label}</div>
      </div>
    </div>
  );
}
