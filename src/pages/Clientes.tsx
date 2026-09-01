import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, Phone, Plus } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { useState } from 'react';
import { formatDate } from '../lib/utils';

export default function Clientes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];

  const filtered = customers.filter((c) =>
    (c.name + c.phone + c.city).toLowerCase().includes(search.toLowerCase())
  );

  const lastService = (customerId: string) =>
    orders.filter((o) => o.customerId === customerId && o.status === 'concluido')
      .sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${customers.length} clientes`}
        action={
          <Button onClick={() => navigate('/app/clientes/novo')}>
            <Plus size={18} /> Novo
          </Button>
        }
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, telefone ou cidade..."
        aria-label="Buscar clientes"
        className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="Nenhum cliente encontrado"
          subtitle="Cadastre seu primeiro cliente para começar."
          action={<Button onClick={() => navigate('/app/clientes/novo')}><Plus size={18} /> Novo cliente</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((c) => {
            const last = lastService(c.id);
            return (
              <Card key={c.id} onClick={() => navigate(`/app/clientes/${c.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-neutral-800 dark:text-neutral-100">{c.name}</div>
                      <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <MapPin size={12} /> {c.city || 'Sem cidade'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <span>
                    {orders.filter((o) => o.customerId === c.id).length} serviços · {budgets.filter((b) => b.customerId === c.id).length} orçamentos
                  </span>
                  <span>Último: {last ? formatDate(last.date) : '—'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
