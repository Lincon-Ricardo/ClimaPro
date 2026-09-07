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
      <div className="absolute inset-0 bg-neutral-900/50" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-neutral-800 ${wide ? 'sm:max-w-2xl lg:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="sticky top-0 z-10 flex min-w-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3.5 dark:border-neutral-700 dark:bg-neutral-800 sm:px-5 sm:py-4">
          <h3 className="min-w-0 flex-1 truncate text-base font-bold text-neutral-800 dark:text-neutral-100 sm:text-lg">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700">
            <X size={20} />
          </button>
        </div>
        <div className="min-w-0 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
