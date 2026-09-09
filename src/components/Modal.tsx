import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#060b18]/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`cp-card cp-rise relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] sm:rounded-[28px] ${wide ? 'sm:max-w-2xl lg:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="sticky top-0 z-10 flex min-w-0 items-center justify-between gap-3 border-b border-neutral-200/70 bg-white/80 px-4 py-3.5 backdrop-blur dark:border-white/10 dark:bg-[#0d1528]/85 sm:px-5 sm:py-4">
          <h3 className="font-display min-w-0 flex-1 truncate text-base font-extrabold text-neutral-900 dark:text-white sm:text-lg">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
        <div className="min-w-0 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
