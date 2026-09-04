import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { Wrench, Plus, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { formatBRL, formatDate } from '../lib/utils';

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'agendados', label: 'Agendados' },
  { key: 'concluidos', label: 'Concluídos' },
  { key: 'cancelados', label: 'Cancelados' },
] as const;

export default function Servicos() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>('todos');
  const allOrders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  const isTech = user?.role === 'tech';
  const techName = (user?.name || '').trim().toLowerCase();
  const techFirstName = (user?.firstName || '').trim().toLowerCase();

  // Técnico: apenas OS atribuídas a ele
  const orders = useMemo(() => {
    if (!isTech) return allOrders;
    return allOrders.filter((o) => {
      const t = (o.technician || '').trim().toLowerCase();
      if (!t) return false;
      return t === techName || t === techFirstName || t.includes(techFirstName);
    });
  }, [allOrders, isTech, techName, techFirstName]);

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  async function handleDelete(orderId: string, osNumber: string) {
    if (!confirm(`Excluir o serviço "${osNumber}"?\n\nEssa ação não pode ser desfeita.`)) return;
    try {
      await db.serviceOrders.delete(orderId);
      toast('success', 'Serviço excluído!');
    } catch {
      toast('error', 'Não foi possível excluir. Tente novamente.');
    }
  }

  const filtered = useMemo(() => {
    const list = orders.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    if (filter === 'pendentes') return list.filter((o) => !['concluido', 'cancelado'].includes(o.status));
    if (filter === 'agendados') return list.filter((o) => o.status === 'agendado' || o.status === 'em_andamento');
    if (filter === 'concluidos') return list.filter((o) => o.status === 'concluido');
    if (filter === 'cancelados') return list.filter((o) => o.status === 'cancelado');
    return list;
  }, [orders, filter]);

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle={`${orders.length} no total`}
        action={<Button onClick={() => navigate('/app/servicos/novo')}><Plus size={18} /> Novo</Button>}
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key ? 'bg-primary-700 text-white' : 'bg-white text-neutral-600 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench size={26} />}
          title="Nenhum serviço encontrado"
          subtitle="Crie um novo serviço para começar."
          action={<Button onClick={() => navigate('/app/servicos/novo')}><Plus size={18} /> Novo serviço</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Card key={o.id} onClick={() => navigate(`/app/servicos/${o.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-neutral-800 dark:text-neutral-100">{custName(o.customerId)}</span>
                    <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">{o.osNumber}</span>
                  </div>
                  <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">❄️ {o.service}</div>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">
                    {o.date ? formatDate(o.date) : 'Sem data'}
                    {o.time ? ` · ${o.time}` : ''} · {formatBRL(o.value)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(o.id, o.osNumber); }}
                    className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/40 dark:hover:text-red-300"
                    title="Excluir serviço"
                    aria-label={`Excluir ${o.osNumber}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
