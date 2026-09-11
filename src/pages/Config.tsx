import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2, Sun, Moon, Monitor } from 'lucide-react';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

const themeOptions = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'dark', label: 'Escuro', icon: Moon },
] as const;

export default function Config() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();
  const { theme, setTheme } = useTheme();

  const [confirmWipe, setConfirmWipe] = useState(false);
  async function wipe() {
    if (user?.role !== 'admin') {
      toast('error', 'Somente administradores podem apagar os dados.');
      return;
    }
    setConfirmWipe(false);
    await Promise.all([
      db.customers.clear(),
      db.equipment.clear(),
      db.budgets.clear(),
      db.serviceOrders.clear(),
      db.payments.clear(),
      db.appointments.clear(),
      db.notifications.clear(),
      db.materials.clear(),
      db.losses.clear(),
    ]);
    toast('info', 'Dados apagados.');
    window.location.reload();
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <PageHeader title="Configurações" />
      <div className="space-y-3">
        <Card>
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Aparência</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Escolha o tema do aplicativo.</p>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
            {themeOptions.map((o) => {
              const active = theme === o.value;
              const Icon = o.icon;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme(o.value)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Icon size={16} />
                  {o.label}
                </button>
              );
            })}
          </div>
        </Card>
        <Card>
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Conta</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{user?.name} · {user?.email}</p>
          <Button variant="outline" className="mt-3" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /> Sair da conta</Button>
        </Card>
        {user?.role === 'admin' && <Card>
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Dados</h2>
          <div className="mt-3">
            <Button variant="danger" onClick={() => setConfirmWipe(true)}><Trash2 size={16} /> Apagar todos os dados</Button>
          </div>
        </Card>}
        <ConfirmDialog open={confirmWipe} title="Apagar todos os dados?" message="Essa ação não pode ser desfeita." onConfirm={wipe} onClose={() => setConfirmWipe(false)} />
      </div>
    </div>
  );
}