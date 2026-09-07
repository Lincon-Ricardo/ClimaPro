import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { Wrench, Plus, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import { useMyOrders } from '../hooks/useTechOrders';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  const [params, setParams] = useSearchParams();
  const VALID = new Set(['todos', 'pendentes', 'agendados', 'concluidos', 'cancelados']);
  const raw = params.get('filter');
  const filter = raw && VALID.has(raw) ? raw : 'todos';

  function setFilterAndSync(next: string) {
    const sp = new URLSearchParams(params);
    if (next === 'todos') sp.delete('filter');
    else sp.set('filter', next);
    setParams(sp, { replace: true });
  }
  const allOrders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const orders = useMyOrders(allOrders);

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';
  const [pendingDelete, setPendingDelete] = useState<{ id: string; osNumber: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await db.serviceOrders.delete(pendingDelete.id);
      toast('success', 'Serviço excluído!');
      setPendingDelete(null);
    } catch {
      toast('error', 'Não foi possível excluir. Tente novamente.');
    } finally {
      setDeleting(false);
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
        subtitle={`${filtered.length} ${filter === 'pendentes' ? 'pendente(s)' : filter === 'todos' ? 'no total' : `em ${filter}`}`}
        action={<Button onClick={() => navigate('/app/servicos/novo')}><Plus size={18} /> Novo</Button>}
      />
      <div className="mb-4 flex gap-2 table-scroll pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilterAndSync(f.key)}
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
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {o.technician ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                        🧑‍🔧 {o.technician}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        ⚠️ Sem técnico
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                    {o.date ? formatDate(o.date) : 'Sem data'}
                    {o.time ? ` · ${o.time}` : ''} · {formatBRL(o.value)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: o.id, osNumber: o.osNumber }); }}
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
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Excluir ${pendingDelete?.osNumber || 'serviço'}?`}
        message="Essa ação não pode ser desfeita."
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
