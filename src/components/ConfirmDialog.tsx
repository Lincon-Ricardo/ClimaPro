import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  danger = true,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{message}</p>
      <div className="mt-5 flex gap-3">
        <Button variant="outline" type="button" onClick={onClose} full>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} type="button" onClick={onConfirm} disabled={busy} full>
          {busy ? 'Aguarde...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
