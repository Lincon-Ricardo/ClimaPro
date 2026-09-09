import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, Plus, Trash2, Upload } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { useState, useMemo } from 'react';
import { formatDate } from '../lib/utils';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { audit } from '../lib/audit';
import { useAuth } from '../context/AuthContext';
import { usePagedList, useDebouncedValue } from '../hooks/usePagedList';
import { Loading } from '../components/Loading';

export default function Clientes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 350);
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const { rows: customers, loading, loadingMore, hasMore, loadMore, total } = usePagedList(
    (p) => db.customers.list({ ...p, pageSize: 24, orIlike: { columns: ['name', 'phone', 'city'], term: debounced } }),
    { orIlike: { columns: ['name', 'phone', 'city'], term: debounced } },
    24,
  );
  const orderCountByCustomer = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach((o) => m.set(o.customerId, (m.get(o.customerId) || 0) + 1));
    return m;
  }, [orders]);
  const budgetCountByCustomer = useMemo(() => {
    const m = new Map<string, number>();
    budgets.forEach((b) => m.set(b.customerId, (m.get(b.customerId) || 0) + 1));
    return m;
  }, [budgets]);

  const lastService = (customerId: string) =>
    orders.filter((o) => o.customerId === customerId && o.status === 'concluido')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuth();
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await (await import('../lib/supabaseClient')).supabase.rpc('delete_customer_cascade', { p_customer_id: deleteTarget.id });
      if (error) throw error;
      audit({ actor: user?.email || user?.id || 'unknown', action: 'delete_customer', entity: 'customers', entityId: deleteTarget.id, detail: deleteTarget.name });
      toast('success', 'Cliente excluído.');
      setDeleteTarget(null);
    } catch {
      toast('error', 'Não foi possível excluir.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${total} clientes`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/app/clientes/importar')}>
              <Upload size={16} /> Importar
            </Button>
            <Button onClick={() => navigate('/app/clientes/novo')}>
              <Plus size={18} /> Novo
            </Button>
          </div>
        }
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, telefone ou cidade..."
        aria-label="Buscar clientes"
        className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />

      {loading ? (
        <Loading />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="Nenhum cliente encontrado"
          subtitle="Cadastre seu primeiro cliente para começar."
          action={<Button onClick={() => navigate('/app/clientes/novo')}><Plus size={18} /> Novo cliente</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((c) => {
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
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: c.id, name: c.name }); }}
                    className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/40 dark:hover:text-red-300"
                    title="Excluir cliente"
                    aria-label={`Excluir ${c.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <span>
                    {orderCountByCustomer.get(c.id) || 0} serviços · {budgetCountByCustomer.get(c.id) || 0} orçamentos
                  </span>
                  <span>Último: {last ? formatDate(last.date) : '—'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {hasMore && (
        <div className="mt-4 text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Excluir "${deleteTarget?.name || 'cliente'}"?`}
        message="Isso remove também equipamentos, serviços e orçamentos dele."
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
