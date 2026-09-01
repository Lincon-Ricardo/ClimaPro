import { useState } from 'react';
import { CheckCheck, Trash2, Bell, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { formatDate } from '../lib/utils';

const TYPE_ICON: Record<string, { icon: React.ReactNode; cls: string }> = {
  info: { icon: <Info size={18} />, cls: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400' },
  success: { icon: <CheckCircle size={18} />, cls: 'bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-300' },
  warning: { icon: <AlertTriangle size={18} />, cls: 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' },
  danger: { icon: <XCircle size={18} />, cls: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
};

export default function Notificacoes() {
  const toast = useToast();
  const notifications = useLiveQuery(() => db.notifications.toArray(), []) || [];
  const [confirmClear, setConfirmClear] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;
  const sorted = [...notifications].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  async function markAllRead() {
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) => db.notifications.update(n.id, { read: true })),
    );
    toast('success', 'Todas as notificações marcadas como lidas.');
  }

  async function markRead(n: { id: string }) {
    await db.notifications.update(n.id, { read: true });
  }

  async function clearAll() {
    await db.notifications.clear();
    setConfirmClear(false);
    toast('info', 'Notificações limpas.');
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notificações"
        subtitle={`${unread} não lida(s)`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={markAllRead} disabled={!unread}>
              <CheckCheck size={16} /> Marcar todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)} disabled={!notifications.length}>
              <Trash2 size={16} /> Limpar
            </Button>
          </div>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState icon={<Bell size={26} />} title="Sem notificações" subtitle="Você será avisado sobre serviços, orçamentos e manutenções." />
      ) : (
        <div className="space-y-2">
          {sorted.map((n) => {
            const t = TYPE_ICON[n.type] || TYPE_ICON.info;
            return (
              <Card key={n.id} className={!n.read ? 'border-primary-200 bg-primary-50/40 dark:border-primary-900/60 dark:bg-primary-900/20' : ''}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.cls}`}>{t.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-neutral-800 dark:text-neutral-100">{n.title}</span>
                      <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">{n.createdAt ? formatDate(n.createdAt) : ''}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">{n.message}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n)}
                      className="shrink-0 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60"
                    >
                      Marcar lida
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Limpar notificações">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Tem certeza que deseja apagar todas as notificações?</p>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" type="button" onClick={() => setConfirmClear(false)}>Cancelar</Button>
          <Button variant="danger" onClick={clearAll}>Apagar tudo</Button>
        </div>
      </Modal>
    </div>
  );
}
