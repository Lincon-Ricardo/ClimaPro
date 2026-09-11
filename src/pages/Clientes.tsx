import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, Plus, Trash2, Upload, Download } from 'lucide-react';
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
  const orders = useLiveQuery(() => db.serviceOrders.list({ pageSize: 200, columns: 'id,customer_id,status,date,value' }).then((r) => r.rows), [], 'service_orders') || [];
  const budgets = useLiveQuery(() => db.budgets.list({ pageSize: 200, columns: 'id,customer_id,status' }).then((r) => r.rows), [], 'budgets') || [];
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
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setExportPct(0);
    try {
      const { db: dbRef, EXPORT_CUSTOMER_COLUMNS } = await import('../lib/db');
      const { downloadCustomersCsv, exportProgressName } = await import('../lib/csv');
      const pageSize = 500;
      let page = 0;
      let totalExp = 0;
      const all: { name?: string; phone?: string; whatsapp?: string; email?: string; document?: string; street?: string; number?: string; complement?: string; district?: string; city?: string; zip?: string; notes?: string }[] = [];
      for (;;) {
        const r = await dbRef.customers.list({
          page, pageSize,
          columns: EXPORT_CUSTOMER_COLUMNS,
          ...(debounced ? { orIlike: { columns: ['name', 'phone', 'city'], term: debounced } } : {}),
        });
        totalExp = r.total;
        all.push(...r.rows.map((c) => ({
          name: c.name, phone: c.phone, whatsapp: c.whatsapp, email: c.email,
          document: c.document, street: c.street, number: c.number,
          complement: c.complement, district: c.district, city: c.city,
          zip: c.zip, notes: c.notes,
        })));
        setExportPct(totalExp ? Math.round((all.length / totalExp) * 100) : 100);
        if (!r.hasMore) break;
        page += 1;
        if (page > 40) break;
      }
      if (!all.length) {
        toast('info', 'Nada para exportar com o filtro atual.');
        return;
      }
      downloadCustomersCsv(all, exportProgressName(all.length));
      const kb = Math.max(1, Math.round(new Blob([JSON.stringify(all)]).size / 1024));
      toast('success', `${all.length} contato(s) exportados em CSV leve (~${kb} KB, só texto).`);
    } catch {
      toast('error', 'Não foi possível exportar.');
    } finally {
      setExporting(false);
      setExportPct(0);
    }
  }

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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download size={16} /> {exporting ? `Exportando ${exportPct}%…` : 'Exportar CSV leve'}
            </Button>
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
