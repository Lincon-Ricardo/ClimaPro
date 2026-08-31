import { useNavigate } from 'react-router-dom';
import { Users, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

export default function Config() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();

  async function wipe() {
    if (!confirm('Apagar todos os dados? Essa ação não pode ser desfeita.')) return;
    await Promise.all([
      db.customers.clear(),
      db.equipment.clear(),
      db.budgets.clear(),
      db.serviceOrders.clear(),
      db.payments.clear(),
      db.appointments.clear(),
      db.notifications.clear(),
    ]);
    toast('info', 'Dados apagados.');
  }

  async function reseed() {
    await db.equipment.clear();
    await db.customers.clear();
    await db.budgets.clear();
    await db.serviceOrders.clear();
    await db.payments.clear();
    await db.appointments.clear();
    await db.notifications.clear();
    window.location.reload();
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Configurações" />
      <div className="space-y-3">
        <Card>
          <h2 className="text-base font-bold text-neutral-800">Conta</h2>
          <p className="mt-1 text-sm text-neutral-500">{user?.name} · {user?.email}</p>
          <Button variant="outline" className="mt-3" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /> Sair da conta</Button>
        </Card>
        <Card>
          <h2 className="text-base font-bold text-neutral-800">Dados</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={reseed}><RefreshCw size={16} /> Restaurar dados de exemplo</Button>
            <Button variant="danger" onClick={wipe}><Trash2 size={16} /> Apagar todos os dados</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
